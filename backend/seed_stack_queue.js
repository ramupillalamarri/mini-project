const pool = require('./src/db');

async function seed() {
  try {
    const game = {
      title: 'Stack & Queue Cargo Loader',
      subject_id: 5,
      topic_id: 13,
      type: 'simulation'
    };

    const existing = await pool.query('SELECT id FROM games WHERE title = $1', [game.title]);
    if (existing.rows.length === 0) {
      await pool.query(
        'INSERT INTO games (subject_id, topic_id, title, type) VALUES ($1, $2, $3, $4)',
        [game.subject_id, game.topic_id, game.title, game.type]
      );
      console.log('Successfully inserted Stack & Queue Cargo Loader game!');
    } else {
      console.log('Game already exists in DB.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

seed();
