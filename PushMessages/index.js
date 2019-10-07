const sql = require('mssql')
const TwitterDataObj = require('../SharedFunctions/TwitterDataObj');

//const DBService = require('./SharedFunctions/DBService')
//import('./SharedFunctions/DBService')

const config = {
    user: process.env['MSSQL_USER'],
    password: process.env['MSSQL_PASSWORD'],
    server: process.env['MSSQL_HOST'], // You can use 'localhost\\instance' to connect to named instance
    database: process.env['MSSQL_DB'],
    pool: {max: 4}, // Free tier Azure MSSQL DB can only have 4 connections
    options: {
        encrypt: true // Use this if you're on Windows Azure
    }
}

const pool = new sql.ConnectionPool(config).connect();

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    let dataObj = {}
    if ((req.body)) {
        try {
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
            
            // const transaction = pool.transaction()
            
            // transaction.begin(err => {
            //     // ... error checks
            
            //     let rolledBack = false
            
            //     transaction.on('rollback', aborted => {
            //         // emited with aborted === true
            
            //         rolledBack = true
            //     })
            //     const request = await transaction.request()

            //     try {
            //         await request.query('insert into employees (EmployeesId, Name, Location) values (5, David, Canada)')
            //         await transaction.commit()
            //     } catch (err) {
            //         if (!rolledBack) {
            //             transaction.rollback(err => {
            //                 // ... error checks
            //                 console.dir(err)
            //             })
            //         }
            //     }
            // })
            
            // poolConnection = await pool
            // poolConnection.on('error', err => {
            //     // ... error handler
            //     console.log(err)
            // })
            // for (let i = 0; i < req.body.length; i++) {
            //     let leader = req.body[i]
            //     let leader_id = BigInt(leader.leader_id_str)
            //     for (let j = 0; j < leader.followers.length; j++) {
            //         let follower = leader.followers[j]
            //         let follower_id = BigInt(follower.follower_id_str)
            //         for (let k = 0; k < follower.tweets.length; k++) {
            //             let tweet = follower.tweets[k]
            //             let result =  await poolConnection.request()
            //                 .input('twitterId', leader_id)
            //                 .input('followerId', follower_id)
            //                 .input('tweetId', BigInt(tweet.tweet_id_str))
            //                 .input('tweetText', tweet.text)
            //                 .query('INSERT INTO TWITTER_DUMP (TwitterID, FollowerID, TweetID, TweetMsg) VALUES (@twitterId, @followerId, @tweetId, @tweetText)')
            //             console.dir(result)
            //         }
            //     }
                
            // }

        try {
            // build the table so we can bulk insert
            const table = new sql.Table('twitter_dump')
            table.create = true
            table.columns.add('LeaderID', sql.VarChar(63), {nullable: false})
            table.columns.add('FollowerID', sql.VarChar(63), {nullable: false})
            table.columns.add('MessageID', sql.VarChar(63), {nullable: false})
            table.columns.add('MessageText', sql.VarChar(319), {nullable: false})
            // req.body.forEach(leader => {
            //     leader.followers.forEach(follower => {
            //         follower.tweets.forEach(tweet => {
            //             table.rows.add(leader.leader_id_str, follower.follower_id_str, tweet.tweet_id_str, tweet.text)
            //         })
            //     })
            // })
            dataObj.followers.forEach(follower => {
                follower.tweets.forEach(tweet => {
                    table.rows.add(dataObj.leader_id_str, follower.follower_id_str, tweet.tweet_id_str, tweet.tweet_message)
                    //console.log(dataObj.leader_id_str + ',' + follower.follower_id_str + ',' + tweet.tweet_id_str + ',' + tweet.tweet_message)
                })
            })
            poolConnection = await pool
            poolConnection.on('error', err => {
                // ... error handler
                console.log(err)
            })
            const result = await poolConnection.request().bulk(table)
            context.res = {
                // status: 200, /* Defaults to 200 */
                body: result
                };
            // Stored procedure
            
            // let result2 = await pool.request()
            //     .input('input_parameter', sql.Int, value)
            //     .output('output_parameter', sql.VarChar(50))
            //     .execute('procedure_name')
            
            // console.dir(result2)
        } catch (err) {
            console.log(err)
            context.res = {
            status: 500, /* Defaults to 200 */
            body: err
            };
            // ... error checks
        }
    } else {
        context.res = {
            status: 400,
            body: "Please POST a json object in the request body"
        };
    }

    function executeStatement() {

        request = new Request("select 42, 'hello world'", function(err, rowCount) {
            if (err) {
                context.log(err);

                context.res = {
                    status: 500,
                    body: "Failed to connect to execute statement."
                };
                context.done();

            } else {
                context.log(rowCount + ' rows');
            }
        });

        request.on('row', function(columns) {
            columns.forEach(function(column) {
                context.log(column.value);
            });

            context.done();
        });

        connection.execSql(request);
    }
  };
