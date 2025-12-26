require('dotenv').config();
const sql = require('mssql');

const server = process.env.DB_SERVER || 'localhost';
const instance = process.env.DB_INSTANCE;

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: server,
    database: process.env.DB_DATABASE || 'master',
    ...(instance ? { 
        options: {
            instanceName: instance,
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true
        }
    } : { 
        port: parseInt(process.env.DB_PORT) || 1433,
        options: {
            encrypt: process.env.DB_ENCRYPT !== 'false',
            trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
            enableArithAbort: true
        }
    }),
    connectionTimeout: 60000,
    requestTimeout: 60000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

const getConnection = async () => {
    try {
        if (pool) {
            return pool;
        }
        pool = await sql.connect(config);
        console.log('SQL Server bağlantısı başarılı');
        return pool;
    } catch (error) {
        console.error('SQL Server bağlantı hatası:', error);
        throw error;
    }
};

module.exports = { getConnection, sql };
