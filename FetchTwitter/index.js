const Twit = require('twit');
const TwitterDataObj = require('../SharedFunctions/TwitterDataObj');
const MIN_TWEET_COUNT = 1000;
const MIN_FOLLOWER_COUNT = 200;
const MAX_CONCURRENT_SEARCHES = 5;
const MESSAGES_PER_REQUEST = 200;

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

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    if (context.bindingData.uid) {
        try {
            context.res = {
                // status: 200, /* Defaults to 200 */
                body: JSON.stringify(await getLeaderData(context.bindingData.uid,req.query.min_followers,req.query.min_messages))
            };
        } catch (err) {
            console.log(err)
            context.res = {
                status: 500,
                body: err.message
            }
        }
    } else {
        context.res = {
            status: 400,
            body: "Please pass a twitter user id on the query string or in the request body"
        };
    }
};

async function getLeaderData(uid, min_followers, min_messages) {
    try {
        let prev_cursor = -1
        let next_cursor = -1
        let valid_results = []
        let invalid_results = []
        if (min_followers === undefined)
            min_followers = MIN_FOLLOWER_COUNT
        if (min_messages === undefined)
            min_messages = MIN_TWEET_COUNT
        while(valid_results.length < min_followers ) {
            let rateLimitedBool = false
            console.log('sending request for followers/ids')
            const followers = await T.get('followers/ids', { user_id: uid, cursor: next_cursor, count: 5000, stringify_ids: true})
            // if there are no ids break out of the loop
            if(followers.data.ids.length == 0) {
                break
            }

            next_cursor = followers.data.next_cursor_str
            prev_cursor = followers.data.previous_cursor_str

            // we do this inside a loop so we don't send 5000 requests at once!
            while(followers.data.ids.length > 0 && !rateLimitedBool && valid_results.length < min_followers) {
                let getTweetsPromises = [];
                for (i = 0; i < Math.min(followers.data.ids.length, MAX_CONCURRENT_SEARCHES); i++) {
                    getTweetsPromises.push(() => getTweets(followers.data.ids.pop(), min_messages).catch(e => e))
                }
                console.log("Sending " + MAX_CONCURRENT_SEARCHES + " requests for tweets")
                const results = await Promise.all(getTweetsPromises.map(task => task()))
                valid_results = valid_results.concat(results.filter(result => !(result instanceof Error) && result.tweets.length >= min_messages))
                invalid_results = invalid_results.concat(results.filter(result => (result instanceof Error)))
                rateLimitedBool = invalid_results.some(e => e.statusCode == 429)
            }
            
            // break out of the loop if we are rate limited
            if (rateLimitedBool)
                break
        }
        console.log('Returning from GetLeaderData. Valid Results: ' + valid_results.length)
        return new TwitterDataObj.LeaderObj(uid, valid_results)
    } catch(err) {
        console.log(err)
        throw err
    }
}

async function getTweets(uid, min_messages) {
    try {
        console.log('sending request for statuses/user_timeline for uid: ' + uid)
        let timeline = await T.get('statuses/user_timeline', {user_id: uid, trim_user: '1', count: MESSAGES_PER_REQUEST, include_rts: 'false', excludes_replies: 'true'})
        
        // We are only insterested in the tweetId and text, so we will simply extract those two things into a new array
        let mappedTimeline = timeline.data.map(item => {
            return new TwitterDataObj.TweetObj(item.id_str, item.text)
        })

        let prev_earliest_id = 0;

        // If we haven't gotten enough messages we will do another request. We also need to check to make sure this person has tweets otherwise this will infinitely loop.
        while (mappedTimeline.length < min_messages && mappedTimeline.length > 0) {
            const earliest_id = minBigInt(...mappedTimeline.map(item => BigInt(item.tweet_id_str))).toString()
            console.log('sending request for statuses/user_timeline')
            timeline = await T.get('statuses/user_timeline', {user_id: uid, trim_user: '1', count: MESSAGES_PER_REQUEST, include_rts: 'false', excludes_replies: 'true', max_id: earliest_id.toString()})
            // Check if timeline is empty. If so, we break out of the loop since it means I've gotten all possible tweets
            // also check if previous earliest_id_str is equal to current. Not sure why, but it was in an example I saw.
            if (timeline.length == 0 || prev_earliest_id == earliest_id) {
                break
            }
            timeline = timeline.data.map(item => {
                return new TwitterDataObj.TweetObj(item.id_str, item.text)
            })
            mappedTimeline = mappedTimeline.concat(timeline)
            prev_earliest_id = earliest_id
        }
        console.log('Returning from getTweets. Found messages: ' + mappedTimeline.length)
        return new TwitterDataObj.FollowerObj(uid, mappedTimeline) 
    } catch (err) {
        console.error('Error for uid: ' + uid + '\n' + err.message)
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