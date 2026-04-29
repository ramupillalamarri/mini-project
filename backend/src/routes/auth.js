const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// Fallback CLIENT ID for demo if env is missing
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1234dummy-client.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Google credential is required' });

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: CLIENT_ID,  
    });
    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'];
    const picture = payload['picture'];

    // Check if user exists
    let result = await pool.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [googleId, email]);
    let user;

    if (result.rows.length === 0) {
      // Role logic: ramupillalamarri66@gmail.com gets teacher default
      const assignedRole = email === 'ramupillalamarri66@gmail.com' ? 'teacher' : 'student';
      
      const insertResult = await pool.query(
        'INSERT INTO users (email, google_id, username, avatar_url, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [email, googleId, name, picture, assignedRole]
      );
      user = insertResult.rows[0];
    } else {
      user = result.rows[0];
      // Sync Google Profile updates
      const updateResult = await pool.query(
        'UPDATE users SET avatar_url = $1, username = $2, google_id = $3 WHERE id = $4 RETURNING *',
        [picture, name, googleId, user.id]
      );
      user = updateResult.rows[0];
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar_url }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar_url } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Google Auth Verification Error' });
  }
});

// Dev bypass login for testing
router.post('/dev-login', async (req, res) => {
  try {
    let result = await pool.query("SELECT * FROM users WHERE email = 'ramupillalamarri66@gmail.com'");
    let user;
    if (result.rows.length === 0) {
      const insertResult = await pool.query(
        "INSERT INTO users (email, google_id, username, role) VALUES ($1, $2, $3, $4) RETURNING *",
        ['ramupillalamarri66@gmail.com', 'dev-id', 'Dev Teacher', 'teacher']
      );
      user = insertResult.rows[0];
    } else {
      user = result.rows[0];
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar_url }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar_url } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Dev Auth Error' });
  }
});

// Admin Route to promote users
router.put('/promote', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { student_id } = req.body;
  if (!student_id) return res.status(400).json({ error: 'student_id required' });

  try {
    const result = await pool.query(
      "UPDATE users SET role = 'teacher' WHERE id = $1 RETURNING id, username, role",
      [student_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Promoted successfully', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get My Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, avatar_url, role, phone_number, address FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Update My Profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { phone_number, address } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET phone_number = $1, address = $2 WHERE id = $3 RETURNING id, username, email, avatar_url, role, phone_number, address",
      [phone_number, address, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
