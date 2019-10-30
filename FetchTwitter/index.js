const TwitterDataObj = require('../SharedFunctions/TwitterDataObj');
const TwitterFetchFunctions = require('../SharedFunctions/TwitterFetchFunctions');
const MessageObj = require('../SharedFunctions/MessageObj')
const MIN_FOLLOWER_COUNT = 1000
const MAX_TWEET_COUNT = 200
const { QueueServiceClient } = require("@azure/storage-queue");
var fs = require('fs'); 
 
module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    if (context.bindingData.uid) {
        let dataObj
        let rateLimited = false

        // Read the query string
        const min_followers = req.query.min_followers || MIN_FOLLOWER_COUNT
        const max_messages_per_follower = req.query.max_messages || MAX_TWEET_COUNT
        let prev_cursor = req.query.prev_cursor || -1
        let next_cursor = req.query.next_cursor || -1  
        
        // Set up our storage queue client
        const STORAGE_CONNECTION_STRING = process.env["AzureWebJobsStorage"];
        const queueServiceClient = QueueServiceClient.fromConnectionString(STORAGE_CONNECTION_STRING);
        const queueClient = queueServiceClient.getQueueClient('twitter-fetch-queue');

        // Check whether we are rate limited. If so, we are not going to do anything except put a message in the storage queue
        try {
            const rateLimits = await TwitterFetchFunctions.checkRateLimit()
            rateLimited = (rateLimits["data"]["resources"]["followers"]["/followers/ids"]["remaining"] == 0) || (rateLimits["data"]["resources"]["statuses"]["/statuses/user_timeline"]["remaining"] == 0)
        } catch (err) {
            // if we get a 429 error it means our checkRateLimit function is rate limited.
            if (err.statusCode == 429) {
                rateLimited = true
            } else { // otherwise just throw the error
                console.error(err.stack)
                context.res = {
                    status: 500,
                    body: err.message
                }
            }
        }
        
        // If we are not rate limited, try getting data
        if(!rateLimited) {
            try {
                dataObj = await TwitterFetchFunctions.getData(context.bindingData.uid, min_followers, max_messages_per_follower)
                prev_cursor = dataObj.prev_cursor
                next_cursor = dataObj.next_cursor

                // If we haven't found enough followers, requeue. Note that i'm not checking whether we have run out of followers, though I should because
                // its possible there just aren't any more followers that fit the criteria, in which case this will requeue endlessly
                if(dataObj === undefined) {
                    let data = new MessageObj.MessageObj(context.bindingData.uid, prev_cursor, next_cursor, min_followers, max_messages_per_follower);
                    let buff = new Buffer(JSON.stringify(data));
                    let base64data = buff.toString('base64');
                    queueClient.sendMessage(base64data, { visibilityTimeout: 900 })
                    console.log("Sent message to queue: " + JSON.stringify(data))
                    // pass back an empty body
                    context.res = {
                        body: ""
                    };
                } else if (dataObj.data.followers.length < min_followers) {
                    let data = new MessageObj.MessageObj(context.bindingData.uid, prev_cursor, next_cursor, min_followers - dataObj.data.followers.length, max_messages_per_follower);
                    let buff = new Buffer(JSON.stringify(data));
                    let base64data = buff.toString('base64');
                    queueClient.sendMessage(base64data, { visibilityTimeout: 900 })
                    console.log("Sent message to queue: " + JSON.stringify(data))
                    console.log("FetchTwitter returning JSON object")

                    // pass back whatever we have
                    context.res = {
                        body: JSON.stringify(dataObj.data)
                    };
                } else {
                    console.log("FetchTwitter returning JSON object")
                    // pass back whatever we have
                    context.res = {
                        body: JSON.stringify(dataObj.data)
                    };
                }
            } catch (err) {
                if (err.statusCode == 429) {
                    rateLimited = true
                } else {
                    console.error(err.stack)
                    context.res = {
                        status: 500,
                        body: err.message
                    }
                }
            }
        }
    } else {
        context.res = {
            status: 400,
            body: "Please pass a twitter user id in url path"
        };
    }
};