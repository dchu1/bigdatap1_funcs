Azure Functions for Big Data CS-GY 6513 Project 1 - Pulling Data from Twitter

For demo, please visit: https://bdp1app.azurewebsites.net/

## Dependencies
- [Twit](https://www.npmjs.com/package/twit)
- [mssql](https://www.npmjs.com/package/mssql)
- [@azure/storage-queue](https://www.npmjs.com/package/@azure/storage-queue)

## FetchAndPush
type: HttpTrigger

endpoint: /api/v1/internal/fetchpush/{uid}

Given a uid, this API will call [FetchTwitter](#FetchTwitter), and then pass the JSON response to [PushMessages](#PushMessages)
## FetchTwitter
type: HttpTrigger

endpoint: /api/v1/twitter/leader/{uid}

Hits the Twitter API to get followers' messages

If we hit a rate limit, we will put a task on the queue with a 15 minute delay (the rate limit window). We will then return whatever data we have gotten as a JSON object. Note that if we hit the daily limit it will simply keep requeuing the message every 15 minutes until we get the required number of followers and message. Note that currently does not work properly due to Twitter's Pagination becoming stale, so the latter fetches fetch lots of duplicate data. 
## FetchTwitterQueueTrigger
type: QueueTrigger

Triggered when a message is read off the queue. It will then call the FetchAndPush API with the parameters in the message
## GetFollowers
HttpTrigger
endpoint: /api/v1/user/{uid}/followers

Makes a DB query to get a list of followers and their message count for a given uid and returns it as a JSON object
## GetMessages
HttpTrigger
endpoint: /api/v1/user/{uid}/messages

Makes a DB query to get a list of messages for a given uid and returns it as a JSON object
## PushMessages
HttpTrigger
endpoint: /api/v1/messages

Inserts data into the DB

## Application Settings
Below is a sample local.settings.json file for deploying locally

```
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": ***,
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "TWITTER_CONSUMER_KEY": "***",
    "TWITTER_CONSUMER_SECRET": "***",
    "TWITTER_ACCESS_TOKEN": "***",
    "TWITTER_ACCESS_TOKEN_SECRET": "***",
    "MSSQL_USER": "***",
    "MSSQL_PASSWORD": "***",
    "MSSQL_HOST": "***",
    "MSSQL_DB": "***",
    "FUNCTION_KEY": "***",
    "FUNCTION_HOST": "***",
    "FUNCTION_PORT": "***"
  }
}
```
