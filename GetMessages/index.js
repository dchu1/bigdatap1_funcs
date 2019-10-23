const sql = require('mssql')
const TwitterDataObj = require('../SharedFunctions/TwitterDataObj');
const DBService = require('../SharedFunctions/DBService')

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    let uid = context.bindingData.uid;
    try {
        await DBService.initConnPool()
        const poolConnection = await DBService.getConnection()
        const result = await poolConnection.request()
            .input('uid', sql.VarChar(63), uid)
            .query('SELECT tweetID, tweet FROM twitter_dump WHERE followerID = @uid FOR JSON PATH')
        
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: result.recordset[0]
            };
    } catch (err) {
        console.log(err)
        context.res = {
            status: 500, /* Defaults to 200 */
            body: err
        };
    }
}