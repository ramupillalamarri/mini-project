require('dotenv').config();
const pool = require('./src/db');
pool.query('SELECT role FROM users WHERE email=$1', ['ramupillalamarri66@gmail.com'], (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
