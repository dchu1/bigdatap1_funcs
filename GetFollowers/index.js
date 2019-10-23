const sql = require('mssql')
const TwitterDataObj = require('../SharedFunctions/TwitterDataObj');
const DBService = require('../SharedFunctions/DBService')

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    await DBService.initConnPool()
    const poolConnection = await DBService.getConnection()
    const uid = context.bindingData.uid;
    try {
        const result = await poolConnection.request()
            .input('uid', sql.VarChar(63), uid)
            .query('SELECT followerID, COUNT(followerID) As messageCount FROM twitter_dump WHERE twitterID = @uid GROUP BY followerID FOR JSON PATH')
        
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