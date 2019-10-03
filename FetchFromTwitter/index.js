const Twit = require('twit');
const MIN_TWEET_COUNT = 1;
const MIN_FOLLOWER_COUNT = 1;
const MAX_TWITTER_CONNECTIONS = 5;
const MESSAGES_PER_REQUEST = 200;

// For debugging purposes we will write what we get back from Twitter to a file
//const fs = require('fs'); 

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

    if (req.query.uid || (req.body && req.body.uid)) {
        if(req.query.minMessages || (req.body && req.body.minMessages)) {
            MIN_TWEET_COUNT = req.query.minMessages;
        }
        if(req.query.minFollowers || (req.body && req.body.minFollowers)) {
            MIN_FOLLOWER_COUNT = minFollowers;
        }

        // TEST CODE
        // try {
        //     //const tweets = await getTweets(req.query.uid)
        //     context.res = {
        //         // status: 200, /* Defaults to 200 */
        //         body: JSON.stringify(await getTweets(req.query.uid))
        //     };
        // } catch (err) {
        //     console.log(err)
        //     context.res = {
        //         status: 500,
        //         body: err
        //     }
        // }

        try {
            //const tweets = await getTweets(req.query.uid)
            context.res = {
                // status: 200, /* Defaults to 200 */
                body: JSON.stringify(await getLeaderData(req.query.uid))
            };
        } catch (err) {
            console.log(err)
            context.res = {
                status: 500,
                body: err
            }
        }

        // END TEST CODE

        // let userObjectArray = {
        //     leader_id: uid,
        //     followers: []
        // }

        // try{
        //     const data = await getData(req.query.uid)
        //     userObjectArray.followers.push(item)
        //     console.log(JSON.stringify(userObjectArray))
        //     context.res = {
        //     // status: 200, /* Defaults to 200 */
        //     body: "Request sent"
        //     };
        // } catch (err) {
        //     context.res = {
        //         // status: 200, /* Defaults to 200 */
        //         status: 400,
        //         body: err
        //     }
        // }
    } else {
        context.res = {
            status: 400,
            body: "Please pass a twitter user id on the query string or in the request body"
        };
    }
};

async function getLeaderData(uid) {
    try {
        let valid_count = 0
        let prev_cursor = -1
        let next_cursor = -1
        let valid_results = []
        let invalid_results = []
        while(valid_results.length < MIN_FOLLOWER_COUNT) {
            console.log('sending request for followers/ids')
            const followers = await T.get('followers/ids', { user_id: uid, cursor: next_cursor, count: 10})
            // if there are no ids break out of the loop
            if(followers.data.ids.length == 0) {
                break
            }

            next_cursor = followers.data.next_cursor_str
            prev_cursor = followers.data.previous_cursor_str
            let getTweetsPromises = [];
            followers.data.ids.forEach(id => {
                // each promise will have a catch statement to handle errors
                getTweetsPromises.push(() => getTweets(id).catch(e => e))
            })

            console.log('Executing Promise.all')
            const results = await Promise.all(getTweetsPromises.map(task => task()))
            // We add a catch method to each promise
            // const results = await Promise.all(getTweetsPromises.map(p => p.catch(e => e)));

            // filter the results and only get those that did not error out
            valid_results = results.filter(result => !(result instanceof Error));
            invalid_results = results.filter(result => (result instanceof Error));

            // filter out the results that do not have more than the minimum number of messages
            valid_results = valid_results.filter(result => (result.tweets.length >= MIN_TWEET_COUNT))
        }
        console.log('Returning from GetLeaderData. Valid Results: ' + valid_results.length)
        return {'leader_id_str': uid, 'followers': valid_results}
    } catch(err) {
        console.log(err)
        throw err
    }
}

async function getTweets(uid) {
    try {
        console.log('sending request for statuses/user_timeline')
        let timeline = await T.get('statuses/user_timeline', {user_id: uid, trim_user: '1', count: MESSAGES_PER_REQUEST, include_rts: 'false', excludes_replies: 'true'})
        
        // We are only insterested in the tweetId and text, so we will simply extract those two things into a new array
        let mappedTimeline = timeline.data.map(item => {
            return {'tweet_id_str': item.id_str, 'text': item.text}
        })

        console.log('Messages Found: ' + mappedTimeline.length)

        let prev_earliest_id = 0;

        // If we haven't gotten enough messages we will do another request. We also need to check to make sure this person has tweets otherwise this will infinitely loop.
        while (mappedTimeline.length < MIN_TWEET_COUNT && mappedTimeline.length > 0) {
            const earliest_id = minBigInt(...mappedTimeline.map(item => BigInt(item.tweet_id_str))).toString()
            console.log('sending request for statuses/user_timeline')
            timeline = await T.get('statuses/user_timeline', {user_id: uid, trim_user: '1', count: MESSAGES_PER_REQUEST, include_rts: 'false', excludes_replies: 'true', max_id: earliest_id.toString()})
            // Check if timeline is empty. If so, we break out of the loop since it means I've gotten all possible tweets
            // also check if previous earliest_id_str is equal to current. Not sure why, but it was in an example I saw.
            if (timeline.length == 0 || prev_earliest_id == earliest_id) {
                break
            }
            timeline = timeline.data.map(item => {
                return {'tweet_id_str': item.id_str, 'text': item.text}
            })
            //let nextTimeline = await getMoreTweets(uid, mappedTimeline.length, )
            mappedTimeline = mappedTimeline.concat(timeline)
            prev_earliest_id = earliest_id
        }
        console.log('Returning from getTweets. Found messages: ' + mappedTimeline.length)
        return {'follower_id_str': uid, 'tweets': mappedTimeline}  
    } catch (err) {
        console.log(err)
        throw err
    }
}

function minBigInt() {
    var len = arguments.length, min = Infinity;
    while (len--) {
      if (arguments[len] < min) {
        min = arguments[len];
      }
    }
    return min;
  };

// fs.writeFile("output.json", jsonContent, 'utf8', function (err) { 
//     if (err) { 
//         console.log("An error occured while writing JSON Object to File."); 
//         return console.log(err); 
//     } 

//     console.log("JSON file has been saved."); 
// }); 