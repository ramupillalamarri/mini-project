const pool = require('./src/db');

async function run() {
  try {
    const result = await pool.query('SELECT id, email, username, role FROM users');
    console.log(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
