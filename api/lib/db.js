// MySQL connection pool — shared across all serverless functions
const mysql = require('mysql2/promise');

let pool;

function getDB() {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.MYSQL_HOST     || 'localhost',
      port:     parseInt(process.env.MYSQL_PORT || '3306'),
      user:     process.env.MYSQL_USER     || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gog_db',
      charset:  'utf8mb4',
      ssl: process.env.MYSQL_SSL === 'false' ? undefined : { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
    });
  }
  return pool;
}

module.exports = { getDB };
