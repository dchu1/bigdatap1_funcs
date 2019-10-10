const sql = require('mssql')
const TwitterDataObj = require('../SharedFunctions/TwitterDataObj');

//const DBService = require('./SharedFunctions/DBService')
//import('./SharedFunctions/DBService')

const config = {
    user: process.env['MSSQL_USER'],
    password: process.env['MSSQL_PASSWORD'],
    server: process.env['MSSQL_HOST'], // You can use 'localhost\\instance' to connect to named instance
    database: process.env['MSSQL_DB'],
    parseJSON: true,
    pool: {max: 4}, // Free tier Azure MSSQL DB can only have 4 connections
    options: {
        encrypt: true // Use this if you're on Windows Azure
    }
}

const pool = new sql.ConnectionPool(config).connect();

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    let uid = context.bindingData.uid;
    try {
        poolConnection = await pool
        poolConnection.on('error', err => {
            // ... error handler
            console.log(err)
        })
        const result = await poolConnection.request()
            .input('uid', sql.VarChar(63), uid)
            .query('SELECT FollowerID AS FollowerID, COUNT(FollowerID) As MessageCount FROM twitter_dump WHERE LeaderID = @uid GROUP BY FollowerID FOR JSON PATH')
        
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: result.recordset[0]
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
}