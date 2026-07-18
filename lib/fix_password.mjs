import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env.local
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = match ? match[1] : null;

async function fixPassword() {
  const pool = new Pool({ connectionString: dbUrl });
  
  // Generate correct hash
  const newHash = bcrypt.hashSync('Pa$$w0rd123!', 10);
  console.log("New correct hash:", newHash);
  
  await pool.query(`UPDATE admins SET password_hash = $1 WHERE username = 'castacadmin'`, [newHash]);
  console.log("Password updated successfully.");
  await pool.end();
}
fixPassword().catch(console.error);
