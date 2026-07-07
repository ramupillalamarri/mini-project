const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbUrl = process.argv[2] || process.env.DATABASE_URL;

if (!dbUrl) {
  console.log('No DATABASE_URL found. Skipping production database seeding.');
  process.exit(0);
}

async function run() {
  const dumpPath = path.join(__dirname, 'local_dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.error('Error: local_dump.json not found. Run dump_local_db.js first.');
    process.exit(1);
  }

  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  console.log('Connecting to production database...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    // 1. Map & Seed Subjects
    const subjectIdMap = {};
    console.log('Seeding subjects...');
    for (const sub of dump.subjects) {
      // Check if exists
      const existing = await client.query('SELECT id FROM subjects WHERE name = $1', [sub.name]);
      if (existing.rows.length > 0) {
        subjectIdMap[sub.id] = existing.rows[0].id;
        console.log(`Subject already exists: ${sub.name} (mapped local ID ${sub.id} -> prod ID ${existing.rows[0].id})`);
      } else {
        const insertRes = await client.query(
          'INSERT INTO subjects (name, description) VALUES ($1, $2) RETURNING id',
          [sub.name, sub.description]
        );
        subjectIdMap[sub.id] = insertRes.rows[0].id;
        console.log(`Inserted subject: ${sub.name} (mapped local ID ${sub.id} -> prod ID ${insertRes.rows[0].id})`);
      }
    }

    // 2. Map & Seed Topics
    const topicIdMap = {};
    console.log('\nSeeding topics...');
    for (const topic of dump.topics) {
      const targetSubId = subjectIdMap[topic.subject_id];
      if (!targetSubId) {
        console.warn(`Warning: Subject mapping not found for topic ${topic.name} (subject_id: ${topic.subject_id})`);
        continue;
      }

      // Check if exists
      const existing = await client.query(
        'SELECT id FROM topics WHERE subject_id = $1 AND name = $2',
        [targetSubId, topic.name]
      );

      if (existing.rows.length > 0) {
        topicIdMap[topic.id] = existing.rows[0].id;
        console.log(`Topic already exists: ${topic.name} (mapped local ID ${topic.id} -> prod ID ${existing.rows[0].id})`);
      } else {
        const insertRes = await client.query(
          'INSERT INTO topics (subject_id, name, description) VALUES ($1, $2, $3) RETURNING id',
          [targetSubId, topic.name, topic.description]
        );
        topicIdMap[topic.id] = insertRes.rows[0].id;
        console.log(`Inserted topic: ${topic.name} (mapped local ID ${topic.id} -> prod ID ${insertRes.rows[0].id})`);
      }
    }

    // 3. Seed Learning Resources
    console.log('\nSeeding learning resources...');
    for (const res of dump.resources) {
      const targetTopicId = topicIdMap[res.topic_id];
      if (!targetTopicId) {
        console.warn(`Warning: Topic mapping not found for resource ${res.title} (topic_id: ${res.topic_id})`);
        continue;
      }

      // Check if exists
      const existing = await client.query(
        'SELECT id FROM learning_resources WHERE topic_id = $1 AND title = $2',
        [targetTopicId, res.title]
      );

      if (existing.rows.length > 0) {
        console.log(`Resource already exists: ${res.title}`);
      } else {
        await client.query(
          'INSERT INTO learning_resources (topic_id, title, type, url) VALUES ($1, $2, $3, $4)',
          [targetTopicId, res.title, res.type, res.url]
        );
        console.log(`Inserted resource: ${res.title}`);
      }
    }

    // 4. Seed Games
    console.log('\nSeeding games...');
    for (const game of dump.games) {
      const targetSubId = subjectIdMap[game.subject_id] || null;
      const targetTopicId = topicIdMap[game.topic_id] || null;

      // Check if exists
      const existing = await client.query(
        'SELECT id FROM games WHERE title = $1',
        [game.title]
      );

      if (existing.rows.length > 0) {
        console.log(`Game already exists: ${game.title}`);
        // Optionally update mappings if they are null in prod
        await client.query(
          'UPDATE games SET subject_id = $1, topic_id = $2 WHERE title = $3',
          [targetSubId, targetTopicId, game.title]
        );
      } else {
        await client.query(
          'INSERT INTO games (subject_id, topic_id, title, type) VALUES ($1, $2, $3, $4)',
          [targetSubId, targetTopicId, game.title, game.type]
        );
        console.log(`Inserted game: ${game.title}`);
      }
    }

    console.log('\nSeeding process completed successfully!');
  } catch (err) {
    console.error('Seeding process failed:', err.message);
  } finally {
    await client.end();
    process.exit(0);
  }
}

run();
