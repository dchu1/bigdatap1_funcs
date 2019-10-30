const https = require('http');
const querystring = require('querystring');

module.exports = async function (context) {
    context.log('Node.js queue trigger function processed work item', JSON.stringify(context.bindings.myQueueItem));
    const uid = context.bindings.myQueueItem.leaderID_str
    delete context.bindings.myQueueItem.leaderID_str
    const qs = '?' + querystring.stringify(context.bindings.myQueueItem)
    const options = {
        hostname: process.env["FUNCTION_HOST"],
        port: process.env["FUNCTION_PORT"],
        path: '/api/v1/internal/fetchpush/' + uid + qs,
        method: 'GET'
      };
    https.get(options).on('error', (e) => {
        console.error(e.stack)
        throw error
    })
}