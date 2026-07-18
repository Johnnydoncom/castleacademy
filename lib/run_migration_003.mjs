import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = match ? match[1] : null;
if (!dbUrl) { console.error("No DATABASE_URL found"); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl });
const query = fs.readFileSync(path.join(__dirname, 'migrations', '003_add_payment_fields.sql'), 'utf-8');
pool.query(query)
  .then(() => { console.log('Migration 003 ran successfully!'); return pool.end(); })
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
