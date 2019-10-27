const sql = require('mssql')
const TwitterDataObj = require('../SharedFunctions/TwitterDataObj');
const DBService = require('../SharedFunctions/DBService')

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    let dataObj = {}
    if ((req.body)) {
        try {
            // Somehow the body is parsed into the correct object so i don't need to do anything. Automatic parsing?
            // Parse the JSON and assign it to our TwitterDataObject object (this is basically to validate)
            //data = JSON.parse(req.body)
            //dataObj = Object.assign(new LeaderObj, req.body)
            dataObj = req.body
        } catch (err) {
            context.res = {
                status: 400,
                body: "JSON object not in expected form"
            };
            context.done
        }          

        try {
            // build the table so we can bulk insert. We have a clustered index on all the rows to ensure no duplicate entries,
            // not for any sql efficiency reasons.
            const table = new sql.Table('twitter_dump')
            table.create = true
            table.columns.add('twitterID', sql.VarChar(63), {nullable: false, primary: true})
            table.columns.add('followerID', sql.VarChar(63), {nullable: false, primary: true})
            table.columns.add('tweetID', sql.VarChar(63), {nullable: false, primary: true})
            table.columns.add('tweet', sql.VarChar(319), {nullable: false, primary: true})
            dataObj.followers.forEach(follower => {
                follower.tweets.forEach(tweet => {
                    table.rows.add(dataObj.leader_id_str, follower.follower_id_str, tweet.tweet_id_str, tweet.tweet_message)
                })
            })

            await DBService.initConnPool()
            const poolConnection = await DBService.getConnection()
            const result = await poolConnection.request().bulk(table)
            context.res = {
                // status: 200, /* Defaults to 200 */
                body: result
                };

        } catch (err) {
            console.error(err)
            context.res = {
                status: 500,
                body: err.message
            };
        }
    } else {
        context.res = {
            status: 400,
            body: "Please POST a json object in the request body"
        }
    }
}
