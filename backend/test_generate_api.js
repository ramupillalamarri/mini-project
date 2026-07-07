const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'learnapp-local-dev-secret-change-me';

async function test() {
  // Generate a valid teacher token
  const token = jwt.sign(
    { id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', username: 'Test Teacher', role: 'teacher' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const payload = {
    title: 'Stack and Queue Operations Quiz',
    subject_id: '5',
    topic_id: '13',
    instructions: 'Create a multiple choice quiz game about stacks (LIFO) and queues (FIFO).',
    description: 'Test your knowledge on Stack and Queue operations!'
  };

  try {
    console.log('Sending POST to /api/games/generate with payload:', payload);
    const res = await axios.post('http://localhost:5000/api/games/generate', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Success Response:', res.data);
  } catch (err) {
    console.error('Error Status:', err.response?.status);
    console.error('Error Data:', err.response?.data);
    console.error('Error Message:', err.message);
  }
}

test();
