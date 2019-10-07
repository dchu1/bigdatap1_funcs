const sql = require('mssql');
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

var _pool
var initialized

function initConnPool() {
    return new Promise(function(resolve, reject) {
        if(_pool) {
            console.warn("Trying to init DB again!");
            resolve();
        }
        _pool = new sql.ConnectionPool(config).connect().then(o => {
            o.on('error', err => {
                console.log(err)
                // ... error handler
            })
        });
    })
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