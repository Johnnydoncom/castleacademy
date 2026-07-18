import { neon } from '@neondatabase/serverless';
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

async function checkLogin() {
  const sql = neon(dbUrl);
  const rows = await sql`SELECT * FROM admins`;
  console.log("Admins in DB:", rows);
  
  if (rows.length > 0) {
    const admin = rows[0];
    const match = await bcrypt.compare('Pa$$w0rd123!', admin.password_hash);
    console.log("Password match for", admin.username, ":", match);
  }
}
checkLogin().catch(console.error);
