import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env.local
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = match ? match[1] : null;

if (!dbUrl) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({ connectionString: dbUrl });
  const query = fs.readFileSync(path.join(__dirname, 'migrations', '002_add_admins.sql'), 'utf-8');
  await pool.query(query);
  console.log('Migration 002 ran successfully!');
  await pool.end();
  process.exit(0);
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
