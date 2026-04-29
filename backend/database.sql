CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone_number VARCHAR(50),
  address TEXT,
  role VARCHAR(50) DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PDFs Table
CREATE TABLE IF NOT EXISTS pdfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  subject VARCHAR(100)
);

-- User PDF Progress
CREATE TABLE IF NOT EXISTS user_pdf_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pdf_id UUID REFERENCES pdfs(id) ON DELETE CASCADE,
  is_opened BOOLEAN DEFAULT false,
  time_spent_seconds INT DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, pdf_id)
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topics Table
CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learning Resources Table
CREATE TABLE IF NOT EXISTS learning_resources (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'pdf',
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Resource Progress Table
CREATE TABLE IF NOT EXISTS user_resource_progress (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resource_id INTEGER REFERENCES learning_resources(id) ON DELETE CASCADE,
  is_opened BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, resource_id)
);

-- Games Table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100)
);

-- User Game Scores
CREATE TABLE IF NOT EXISTS user_game_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  attempts INT DEFAULT 0,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample games
INSERT INTO games (title, type) VALUES ('Math Quiz', 'quiz') ON CONFLICT DO NOTHING;
INSERT INTO games (title, type) VALUES ('Memory Match', 'logic') ON CONFLICT DO NOTHING;
