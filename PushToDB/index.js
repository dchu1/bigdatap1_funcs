var Twit = require('twit');
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var MIN_TWEET_COUNT = 200;
var MIN_FOLLOWER_COUNT = 1000;

var T = new Twit({
    consumer_key:         '2limliqq50Pxmya5yeV9oK4Pv',
    consumer_secret:      'VBCm8WPTV6w34mwewBNXOdgYjIEY5xpte0m1WumUknPkcCqAEo',
    access_token:         '1176502481649623042-gmR8nDWgPchMFkySzI5q8r8COnnckX',
    access_token_secret:  'pnsoHnVVclRQnDG8rV0QetvDwO75bFOhDrxPVN7NyHF71',
    timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
    strictSSL:            true,     // optional - requires SSL certificates to be valid.
  })

  var config = {
    userName: '<userName>',
    password: '<password>',
    server: '<AzureSQLDBName>.database.windows.net',

    // If you're on Windows Azure, you will need this:
    options:
        {
                database: 'your DB',
                encrypt: true
        }
};

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (req.query.uid || (req.body && req.body.uid)) {
        if(req.query.minMessages || (req.body && req.body.minMessages)) {
            MIN_TWEET_COUNT = req.query.minMessages;
        }
        if(req.query.minFollowers || (req.body && req.body.minFollowers)) {
            MIN_FOLLOWER_COUNT = minFollowers;
        }

            // SQL Insertion Part
            // var connection = new Connection(config);

            // connection.on('connect', function(err) {
        
            //     if (err) {
            //         context.log(err);
        
            //         context.res = {
            //             status: 500,
            //             body: "Unable to establish a connection."
            //         };
            //         context.done();
        
            //     } else {
            //         executeStatement();
            //     }
            // });

            

            context.res = {
            // status: 200, /* Defaults to 200 */
            body: "Request sent"
            };
    } else {
        context.res = {
            status: 400,
            body: "Please pass a name on the query string or in the request body"
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
