require('dotenv').config();
const pool = require('./src/db');
pool.query('DELETE FROM games WHERE title=$1 RETURNING *', ['Tree Climber'], (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
