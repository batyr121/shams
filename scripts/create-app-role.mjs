import { Pool } from "pg";
const password = process.env.POSTGRES_APP_PASSWORD;
if (!password || password.length < 16)
  throw Error("Set POSTGRES_APP_PASSWORD (at least 16 characters).");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
try {
  await c.query("BEGIN");
  await c.query(
    "DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ball_app') THEN CREATE ROLE ball_app LOGIN;END IF;END$$",
  );
  await c.query("SELECT set_config('ball.app_password',$1,true)", [password]);
  await c.query(
    "DO $$BEGIN EXECUTE format('ALTER ROLE ball_app PASSWORD %L',current_setting('ball.app_password'));END$$",
  );
  await c.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
  await c.query("GRANT USAGE ON SCHEMA public TO ball_app");
  await c.query(
    "GRANT SELECT,INSERT,UPDATE,DELETE ON admin_users,admin_sessions,rate_limits,event_settings,couple_applications,media,voting_sessions,voting_tickets,votes,event_program,gallery_images,audit_log TO ball_app",
  );
  await c.query(
    "GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ball_app",
  );
  await c.query("COMMIT");
  console.log("Restricted ball_app role is ready.");
} catch (e) {
  await c.query("ROLLBACK");
  throw e;
} finally {
  c.release();
  await pool.end();
}
