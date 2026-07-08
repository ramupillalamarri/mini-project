const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure Multer for resources
const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain'
]);

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

// GET all subjects with topics and resources
router.get('/', async (req, res) => {
  try {
    const subjectsResult = await pool.query('SELECT * FROM subjects ORDER BY created_at ASC');
    const topicsResult = await pool.query('SELECT * FROM topics ORDER BY created_at ASC');
    const resourcesResult = await pool.query('SELECT * FROM learning_resources ORDER BY created_at ASC');

    // Build nested structure
    const subjects = subjectsResult.rows.map(sub => {
      const subTopics = topicsResult.rows.filter(t => t.subject_id === sub.id).map(topic => {
        const topicResources = resourcesResult.rows.filter(r => r.topic_id === topic.id);
        return { ...topic, resources: topicResources };
      });
      return { ...sub, topics: subTopics };
    });

    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a subject
router.post('/', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = await pool.query(
      'INSERT INTO subjects (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a subject
router.put('/:id', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = await pool.query(
      'UPDATE subjects SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description || '', id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a subject
router.delete('/:id', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM subjects WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a topic under a subject
router.post('/:subjectId/topics', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { subjectId } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = await pool.query(
      'INSERT INTO topics (subject_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [subjectId, name, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a topic
router.put('/:subjectId/topics/:topicId', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { subjectId, topicId } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = await pool.query(
      'UPDATE topics SET name = $1, description = $2 WHERE id = $3 AND subject_id = $4 RETURNING *',
      [name, description || '', topicId, subjectId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topic not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a topic
router.delete('/:subjectId/topics/:topicId', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { subjectId, topicId } = req.params;

  try {
    const result = await pool.query('DELETE FROM topics WHERE id = $1 AND subject_id = $2 RETURNING *', [topicId, subjectId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topic not found' });
    res.json({ message: 'Topic deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a resource under a topic (handles database-stored persistent uploads)
router.post('/topics/:topicId/resources', authenticateToken, requireRole('teacher'), upload.single('file'), async (req, res) => {
  const { topicId } = req.params;
  const { title } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!req.file) return res.status(400).json({ error: 'File is required' });

  try {
    await pool.query('BEGIN');

    const fileExtension = path.extname(req.file.originalname).replace('.', '').toLowerCase();
    
    // 1. Insert placeholder row in learning_resources
    const resourceResult = await pool.query(
      'INSERT INTO learning_resources (topic_id, title, type, url) VALUES ($1, $2, $3, $4) RETURNING *',
      [topicId, title, fileExtension || 'file', '']
    );
    const resourceId = resourceResult.rows[0].id;

    // 2. Insert binary file data into resource_files
    const fileResult = await pool.query(
      'INSERT INTO resource_files (resource_id, file_name, mime_type, file_data) VALUES ($1, $2, $3, $4) RETURNING id',
      [resourceId, req.file.originalname, req.file.mimetype, req.file.buffer]
    );
    const fileId = fileResult.rows[0].id;

    // 3. Update url in learning_resources to point to dynamic retrieval path
    const finalUrl = `/api/subjects/resources/file/${fileId}`;
    const updateResult = await pool.query(
      'UPDATE learning_resources SET url = $1 WHERE id = $2 RETURNING *',
      [finalUrl, resourceId]
    );

    await pool.query('COMMIT');
    res.status(201).json(updateResult.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Failed to upload file to database:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Retrieve dynamic database-stored resource file
router.get('/resources/file/:fileId', async (req, res) => {
  const { fileId } = req.params;
  try {
    const result = await pool.query(
      'SELECT file_name, mime_type, file_data FROM resource_files WHERE id = $1',
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('File not found');
    }

    const file = result.rows[0];
    
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);
    res.send(file.file_data);
  } catch (err) {
    console.error('Error fetching file from database:', err);
    res.status(500).send('Server error');
  }
});

// Record Progress
router.post('/resources/progress', authenticateToken, async (req, res) => {
  const { resource_id, time_spent_seconds } = req.body;
  const user_id = req.user.id;

  if (!resource_id) return res.status(400).json({ error: 'resource_id is required' });

  try {
    const result = await pool.query(
      `INSERT INTO user_resource_progress (user_id, resource_id, is_opened, time_spent_seconds, last_accessed)
       VALUES ($1, $2, true, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, resource_id) 
       DO UPDATE SET 
          time_spent_seconds = user_resource_progress.time_spent_seconds + EXCLUDED.time_spent_seconds,
          last_accessed = CURRENT_TIMESTAMP
       RETURNING *`,
      [user_id, resource_id, time_spent_seconds || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a resource
router.put('/resources/:resourceId', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { resourceId } = req.params;
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const result = await pool.query(
      'UPDATE learning_resources SET title = $1 WHERE id = $2 RETURNING *',
      [title, resourceId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Resource not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a resource
router.delete('/resources/:resourceId', authenticateToken, requireRole('teacher'), async (req, res) => {
  const { resourceId } = req.params;

  try {
    // Get the resource to find the file
    const resourceResult = await pool.query('SELECT * FROM learning_resources WHERE id = $1', [resourceId]);
    
    if (resourceResult.rows.length === 0) return res.status(404).json({ error: 'Resource not found' });

    const resource = resourceResult.rows[0];
    
    // Delete file from disk if it exists
    if (resource.url) {
      const filename = resource.url.split('/').pop();
      const filePath = path.join(__dirname, '../../uploads/resources', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await pool.query('DELETE FROM learning_resources WHERE id = $1', [resourceId]);
    res.json({ message: 'Resource deleted successfully' });
  } catch (err) {
    console.error('Error deleting resource:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
