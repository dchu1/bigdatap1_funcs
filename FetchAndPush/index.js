const http = require('http');
const querystring = require('querystring');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function \'FetchAndPush\' processed a request.');

    if (context.bindingData.uid) {
        try {
            
            const uid = context.bindingData.uid;
            // reconstruct the query string
            let qs = ''
            if(Object.keys(req.query).length > 0)
                qs += '?' + buildQuery(req.query)
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
                        console.error(err.message)
                        throw err
                    })
                    req.write(data)
                    req.end
                });

            }).on("error", (err) => {
                console.error(err.message)
                throw err
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

function buildQuery (data) {

    // If the data is already a string, return it as-is
    if (typeof (data) === 'string') return data;
    
    // Create a query array to hold the key/value pairs
    let query = [];
    
    // Loop through the data object
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
    
        // Encode each key and value, concatenate them into a string, and push them to the array
        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
        }
    }
    
    // Join each item in the array with a `&` and return the resulting string
    return query.join('&');
    
    }