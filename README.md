Azure Functions for Big Data CS-GY 6513 Project 1 - Pulling Data from Twitter

## FetchAndPush
type: HttpTrigger

endpoint: /api/v1/internal/fetchpush/{uid}

Given a uid, this API will call FetchTwitter, and then pass the JSON response to PushMessages
## FetchTwitter
type: HttpTrigger

endpoint: /api/v1/twitter/leader/{uid}

Hits the Twitter API to get followers' messages

If we hit a rate limit, we will put a task on the queue with a 15 minute delay (the rate limit window). We will then return whatever data we have gotten as a JSON object. Note that if we hit the daily limit it will simply keep requeuing the message every 15 minutes. 
## FetchTwitterQueueTrigger
type: QueueTrigger

Triggered when a message is read off the queue. It will then call the FetchAndPush API with the parameters in the message
## GetFollowers
HttpTrigger
endpoint: /api/v1/user/{uid}/followers

Makes a DB query to get a list of followers and their message count for a given uid
## GetMessages
HttpTrigger
endpoint: /api/v1/user/{uid}/messages

Makes a DB query to get a list of messages for a given uid
## PushMessages
HttpTrigger
endpoint: /api/v1/messages

Inserts data into the DB
