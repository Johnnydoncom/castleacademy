CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the default admin user with the requested credentials
INSERT INTO admins (username, password_hash)
VALUES ('castacadmin', '$2b$10$ZVuM8U9pVPKVxif5p0t78epVdZhwGvCiK/inSU0qnS6ZspgFgVHTW')
ON CONFLICT (username) DO NOTHING;
