const pool = require('./src/db');

(async () => {
  try {
    const result = await pool.query("SELECT id, email, role, username FROM users WHERE role='teacher' LIMIT 5");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
