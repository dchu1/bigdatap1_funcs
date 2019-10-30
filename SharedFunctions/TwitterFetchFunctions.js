const MESSAGES_PER_REQUEST = 200    //200
const FOLLOWERS_PER_REQUEST = 200   //900
const MAX_CONCURRENT_SEARCHES = 20   //20
const Twit = require('twit');
const TwitterDataObj = require('./TwitterDataObj');
const ERROR_PANIC_RATE = 0.3

const T = new Twit({
    consumer_key:         process.env["TWITTER_CONSUMER_KEY"],
    consumer_secret:      process.env["TWITTER_CONSUMER_SECRET"],
    // access token not needed for app_only_auth
    // access_token:         process.env["TWITTER_ACCESS_TOKEN"],
    // access_token_secret:  process.env["TWITTER_ACCESS_TOKEN_SECRET"],
    app_only_auth:        true,
    timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
    strictSSL:            true,     // optional - requires SSL certificates to be valid.
  })

async function checkRateLimit() {
    return T.get('application/rate_limit_status', { resources: "followers,statuses"})
}

async function getData(uid, min_followers, max_tweets_per_follower, followers_per_request = FOLLOWERS_PER_REQUEST, prev_cursor = -1, next_cursor = -1) {
    let validFollowerCount = 0
    let followerList = []
    let followerObjList = []
    let followersObj = {}
    let tweetsObj = {}
    while (validFollowerCount < min_followers) {
        // If our follower list is empty, we will get more
        if(followerList.length == 0) {
            try {
                followersObj = await getFollowers(uid, followers_per_request, prev_cursor, next_cursor)
            } catch (err) {
                // if we are rate limited, but we have data to return
                if (err.statusCode == 429 && tweetsObj.data !== undefined) {
                    console.log("Returning from getData, found " + validFollowerCount +" valid results")
                    return { data: new TwitterDataObj.LeaderObj(uid, followerObjList), rateLimited: true, prev_cursor: prev_cursor, next_cursor: next_cursor }
                } else {
                    throw err
                }
            }
            followersObj.data.users.forEach(userObj => {
                if (userObj.statuses_count > 0 && userObj.protected == false)
                    followerList.push(userObj.id_str)
            })
            prev_cursor = followersObj.data.previous_cursor_str
            next_cursor = followersObj.data.next_cursor_str
        }
        tweetsObj = await getTweets(followerList, min_followers, max_tweets_per_follower)
        validFollowerCount += tweetsObj.data.length
        followerObjList = followerObjList.concat(tweetsObj.data)
        if (tweetsObj.rateLimited) {
            break
        }
    }
    console.log("Returning from getData, found " + validFollowerCount +" valid results")
    return { data: new TwitterDataObj.LeaderObj(uid, followerObjList), rateLimited: tweetsObj.rateLimited, prev_cursor: prev_cursor, next_cursor: next_cursor }
}

async function getFollowers(uid, followers_per_request = FOLLOWERS_PER_REQUEST, prev_cursor = -1, next_cursor = -1) {
    console.log('sending request for followers/ids')
    try {
        //return await T.get('followers/ids', { user_id: uid, cursor: next_cursor, count: followers_per_request, stringify_ids: true})
        return await T.get('followers/list', { user_id: uid, cursor: next_cursor, count: followers_per_request, stringify_ids: true, skip_status: true, include_user_entities: false })
    } catch(err) {
        console.error(err.stack)
        throw err
    }
}

async function getTweets(followersList, min_followers, max_tweets) {
    let rateLimitedBool = false
    let valid_results = []
    let error_results = []
    let fetchCounter = 0
    let errorCounter = 0
    // If followers list length is 0
    if(followersList.length == 0) {
        new {data: [], leftoverFollowersList: followersList, rateLimited: rateLimitedBool}
    }
    try {
        // we do this inside a loop so we don't send FOLLOWERS_PER_REQUEST requests at once. note that we are rate limited to 900 requests in
        // every 15 minute window. Therefore we will never actually be able to loop twice since I will have for sure hit the
        // rate limit after 1 loop (assuming FOLLOWERS_PER_REQUEST >= 900). 
        while(followersList.length > 0 && !rateLimitedBool && valid_results.length < min_followers) {
            let getTweetsPromises = [];

            // We will send the requests for messages in batches of MAX_CONCURRENT_SEARCHES since I don't know if there is a
            // limit to the number of outgoing connections for Azure Functions or incomming connections for Twitter.
            // Ideally this would be done with worker threads rather than with Promise.all batches as i'm doing. Unfortunately 
            // I don't know how or even if you can create worker threads in NodeJS.
            for (i = 0; i < Math.min(followersList.length, MAX_CONCURRENT_SEARCHES); i++) {
                getTweetsPromises.push(() => getTweetsForUser(followersList.pop(), max_tweets).catch(e => e))
            }
            console.log("Sending " + MAX_CONCURRENT_SEARCHES + " requests for tweets")
            fetchCounter += MAX_CONCURRENT_SEARCHES
            const results = await Promise.all(getTweetsPromises.map(task => task()))

            // filter out valid and invalid results
            results.forEach(result => {
                if (!(result instanceof Error) && result.tweets.length > 0) {
                    valid_results.push(result)
                } else if (result instanceof Error) {
                    error_results.push(result)
                    errorCounter++
                }
            })
            // We check the error results for status code 429, which means we are rate limited. If this boolean is true,
            // the loop will end
            rateLimitedBool = error_results.some(e => e.statusCode == 429)

            // We also calculate the % of our requests are ending in errors. If they are too great, I'm going to panic and throw an error that includes
            // the last received error
            // if (errorCounter > 0 && fetchCounter/errorCounter > ERROR_PANIC_RATE) {
            //     let err = new Error("Too many errors when getting Tweets")
            //     err.lasterror = error_results.pop()
            //     throw err
            // }
        }
        console.log('Returning from GetTweets. Valid Results: ' + valid_results.length)
        return  { data: valid_results, leftoverFollowersList: followersList, rateLimited: rateLimitedBool }
    } catch(err) {
        console.log(err)
        throw err
    }
}

async function getTweetsForUser(uid, max_messages) {
    try {
        console.log('sending request for statuses/user_timeline for uid: ' + uid)
        let timeline = await T.get('statuses/user_timeline', {user_id: uid, trim_user: '1', count: MESSAGES_PER_REQUEST, include_rts: 'false', excludes_replies: 'true'})
        
        // We are only interested in the tweetId and text, so we will simply extract those two things into a new array
        let mappedTimeline = timeline.data.map(item => {
            return new TwitterDataObj.TweetObj(item.id_str, item.text)
        })

        let prev_earliest_id = 0;

        // If we haven't gotten enough messages we will do another request. We also need to check to make sure this person has tweets otherwise this will infinitely loop.
        // while (mappedTimeline.length < max_messages && mappedTimeline.length > 0) {
        //     const earliest_id = minBigInt(...mappedTimeline.map(item => BigInt(item.tweet_id_str))).toString()
        //     console.log('sending request for statuses/user_timeline')
        //     timeline = await T.get('statuses/user_timeline', {user_id: uid, trim_user: '1', count: MESSAGES_PER_REQUEST, include_rts: 'false', excludes_replies: 'true', max_id: earliest_id.toString()})
        //     // Check if timeline is empty. If so, we break out of the loop since it means I've gotten all possible tweets
        //     // also check if previous earliest_id_str is equal to current. Not sure why, but it was in an example I saw.
        //     if (timeline.length == 0 || prev_earliest_id == earliest_id) {
        //         break
        //     }
        //     timeline = timeline.data.map(item => {
        //         return new TwitterDataObj.TweetObj(item.id_str, item.text)
        //     })
        //     mappedTimeline = mappedTimeline.concat(timeline)
        //     prev_earliest_id = earliest_id
        // }
        // Truncate the array to 200 since the assignment says 'up to 200 messages'
        mappedTimeline.length = Math.min(mappedTimeline.length, 200)
        console.log('Returning from getTweets. Found messages: ' + mappedTimeline.length)
        return new TwitterDataObj.FollowerObj(uid, mappedTimeline) 
    } catch (err) {
        console.error('Error for uid: ' + uid + '\n' + err.message)
        err.uid = uid // add uid to the error object in case we want to do something with it
        throw err
    }
}

// Function to find the minimum of a range of BigInts. We cannot use the built in Math.min function because it cannot handle BigInts
function minBigInt() {
    var len = arguments.length, min = Infinity;
    while (len--) {
      if (arguments[len] < min) {
        min = arguments[len];
      }
    }
    return min;
  };

module.exports = {
    checkRateLimit,
    getData,
    getFollowers,
    getTweets
};