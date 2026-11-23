import { Pool } from "pg";
import { randomBytes, scryptSync } from "node:crypto";
try {
  process.loadEnvFile(".env.local");
} catch {}
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
  password = process.env.ADMIN_PASSWORD;
if (
  !email ||
  !email.includes("@") ||
  !password ||
  password.length < 12 ||
  password.length > 256
)
  throw Error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD (12–256 characters) in the environment.",
  );
const salt = randomBytes(16).toString("hex");
const passwordHash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(
    "INSERT INTO admin_users(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash",
    [email, passwordHash],
  );
  await pool.query(
    "DELETE FROM admin_sessions WHERE admin_id=(SELECT id FROM admin_users WHERE email=$1)",
    [email],
  );
  console.log(
    "Administrator account is ready. Existing sessions were invalidated.",
  );
} finally {
  await pool.end();
}
