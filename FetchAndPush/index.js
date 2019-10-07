const http = require('http');
const querystring = require('querystring');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function \'FetchAndPush\' processed a request.');

    if (context.bindingData.uid) {
        try {
            
            const uid = context.bindingData.uid;
            // reconstruct the query string
            let qs = ''
            if (req.query.min_followers !== undefined || req.query.min_messages !== undefined)
                qs = '/?' 
                    + req.query.min_followers !== undefined ? 'min_followers=' + req.query.min_followers : ''
                    + req.query.min_messages !== undefined ? 'min_messages=' + req.query.min_messages : ''
            console.log('Fetch/push for user id: ' + uid + ' with querystring: ' + qs)
            const options = {
                hostname: 'localhost',
                port: 7071,
                path: '/api/v1/twitter/leader/' + uid + qs,
                method: 'GET'
              };
            http.get(options, (resp) => {
                let data = '';

                // A chunk of data has been recieved.
                resp.on('data', (chunk) => {
                    data += chunk;
                });

                // The whole response has been received. Make the second call
                resp.on('end', () => {
                    const options2 = {
                        hostname: 'localhost',
                        port: 7071,
                        path: '/api/v1/messages',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(data)
                        }
                    }
                    let req = http.request(options2, (resp2) => {
                        resp2.on('data', (d) => {
                            console.log(d)
                        })
                    }).on("error", (err) => {
                        console.log("Error: " + err.message);
                    })
                    req.write(data)
                    req.end
                });

            }).on("error", (err) => {
                console.log("Error: " + err.message);
            })
        } catch (err) {
            console.log(err)
            context.res = {
                status: 500,
                body: err
            }
        }
        context.res = {
            status: 200,
            body: "Request Sent"
        }
    } else {
        context.res = {
            status: 400,
            body: "Please pass a twitter user id on the query string or in the request body"
        };
    }
};