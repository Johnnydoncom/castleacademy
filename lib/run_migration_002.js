import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!);
  const query = fs.readFileSync(path.join(__dirname, 'migrations', '002_add_admins.sql'), 'utf-8');
  await sql(query);
  console.log('Migration 002 ran successfully!');
}

runMigration().catch(console.error);
