const pool = require('./src/db');

async function seedCNGames() {
  try {
    console.log('Finding or creating Computer Networks subject...');
    let subjectRes = await pool.query("SELECT id FROM subjects WHERE name ILIKE '%Computer Networks%' LIMIT 1");
    let subjectId;

    if (subjectRes.rows.length === 0) {
      console.log('Creating Computer Networks subject...');
      subjectRes = await pool.query(
        "INSERT INTO subjects (name, description) VALUES ($1, $2) RETURNING id",
        ['Computer Networks', 'Learn about protocols, routing, and data transmission.']
      );
    }
    subjectId = subjectRes.rows[0].id;

    const getOrCreateTopic = async (name, description) => {
      let res = await pool.query("SELECT id FROM topics WHERE subject_id = $1 AND name ILIKE $2", [subjectId, `%${name}%`]);
      if (res.rows.length > 0) return res.rows[0].id;
      
      console.log(`Creating topic: ${name}...`);
      res = await pool.query(
        "INSERT INTO topics (subject_id, name, description) VALUES ($1, $2, $3) RETURNING id",
        [subjectId, name, description]
      );
      return res.rows[0].id;
    };

    const routingId = await getOrCreateTopic('IP Addressing & Routing', 'Understand IP, Subnets, and Routing Algorithms');
    const errorId = await getOrCreateTopic('Error Control', 'ARQ Protocols and Reliable Data Transfer');
    const transportId = await getOrCreateTopic('Transport Layer', 'TCP vs UDP and Session Management');

    const gamesToInsert = [
      { title: 'Packet Navigator: Routing & IP Challenge', type: 'simulation', topic_id: routingId },
      { title: 'ARQ Battle: Reliable Data Transmission Simulator', type: 'simulation', topic_id: errorId },
      { title: 'Protocol Race: TCP vs UDP Showdown', type: 'simulation', topic_id: transportId }
    ];

    for (const game of gamesToInsert) {
      const existing = await pool.query('SELECT id FROM games WHERE title = $1', [game.title]);
      if (existing.rows.length === 0) {
        try {
          await pool.query(
            'INSERT INTO games (subject_id, topic_id, title, type) VALUES ($1, $2, $3, $4)',
            [subjectId, game.topic_id, game.title, game.type]
          );
          console.log(`Inserted game: ${game.title}`);
        } catch (insertErr) {
          console.error(`Failed to insert ${game.title}:`, insertErr.message);
        }
      } else {
        console.log(`Game already exists: ${game.title}`);
      }
    }

    console.log('CN Games Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

seedCNGames();
