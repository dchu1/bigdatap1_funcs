const sql = require('mssql');
const config = {
    user: process.env['MSSQL_USER'],
    password: process.env['MSSQL_PASSWORD'],
    server: process.env['MSSQL_HOST'], // You can use 'localhost\\instance' to connect to named instance
    database: process.env['MSSQL_DB'],
    parseJSON: true, // Not sure if this will break things...Useful for getting data back in json form so I don't need to format it
    pool: {max: 4}, // Free tier Azure MSSQL DB can only have 4 connections
    connectionTimeout: 120000, // Increase connection timeout from 15s to 2 min because i'm using Azure SQL, which can take some time to spin up
    options: {
        encrypt: true // Use this if you're on Windows Azure
    }
}

let _pool
let initialized

async function initConnPool() {
    if(_pool) {
        console.warn("Trying to init DB again!");
        return
    }
    console.log('Initializing DBService Connection Pool')
    _pool = await new sql.ConnectionPool(config).connect()
    _pool.on('error', err => {
                console.log(err)
                // ... error handler
            })
    initialized = true
    console.log("DBService Connection Pool Initialized")
}

async function getConnection() {
    if(initialized)
        return await _pool
    else
        throw Error("Connection Pool has not been initialized. Please called init first.")
}
module.exports = {
    initConnPool,
    getConnection
};