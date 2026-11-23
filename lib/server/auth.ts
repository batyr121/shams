import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { query, HttpError } from "./database";
export const scrypt = promisify(scryptCb);
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [method, salt, key] = stored.split(":");
  if (method !== "scrypt" || !salt || !key) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function admin() {
  const token = (await cookies()).get("ball_session")?.value;
  if (!token) return null;
  const r = await query<{ id: string; email: string }>(
    "SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.role='admin'",
    [hash(token)],
  );
  return r.rows[0] || null;
}
export async function requireAdmin() {
  const user = await admin();
  if (!user) throw new HttpError(401, "Administrator sign-in required.");
  return user;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  const allowed = [expected];
  if (
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_NETWORK_ORIGIN
  )
    allowed.push(process.env.LOCAL_NETWORK_ORIGIN);
  if (!origin || !allowed.includes(origin))
    throw new HttpError(403, "Request origin is not allowed.");
}
export async function limit(key: string, max: number, seconds: number) {
  const r = await query<{ attempts: number }>(
    `INSERT INTO rate_limits(key,attempts,reset_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.attempts+1 END,reset_at=CASE WHEN rate_limits.reset_at<now() THEN now()+$2*interval '1 second' ELSE rate_limits.reset_at END RETURNING attempts`,
    [hash(key), seconds],
  );
  if (r.rows[0].attempts > max)
    throw new HttpError(429, "Too many attempts. Please try again later.");
}
export async function startSession(adminId: string) {
  const token = randomBytes(32).toString("hex");
  await query(
    "INSERT INTO admin_sessions(token_hash,admin_id,expires_at) VALUES($1,$2,now()+interval '12 hours')",
    [hash(token), adminId],
  );
  (await cookies()).set("ball_session", token, {
    httpOnly: true,
    secure:
      process.env.COOKIE_SECURE === "true" ||
      process.env.APP_ORIGIN?.startsWith("https://") === true,
    sameSite: "strict",
    path: "/",
    maxAge: 43200,
  });
}
