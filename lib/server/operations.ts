import type { PoolClient } from "pg";
import { createHash } from "node:crypto";
import { HttpError } from "./database";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function castVote(
  c: Pick<PoolClient, "query">,
  code: string,
  couple: string,
) {
  const s = (
    await c.query(
      "SELECT voting_status FROM event_settings WHERE id=1 FOR SHARE",
    )
  ).rows[0];
  if (s.voting_status !== "open")
    throw new HttpError(409, "Voting is not open.");
  const t = (
    await c.query(
      "SELECT t.* FROM voting_tickets t JOIN voting_sessions s ON s.id=t.session_id WHERE t.token_hash=$1 AND s.active FOR UPDATE OF t",
      [digest(code.trim().toUpperCase())],
    )
  ).rows[0];
  if (!t || t.revoked || t.used_at)
    throw new HttpError(
      409,
      "This guest code is invalid, revoked, or already used.",
    );
  const eligible = await c.query(
    "SELECT id FROM couple_applications WHERE id=$1 AND status='approved' FOR SHARE",
    [couple],
  );
  if (!eligible.rowCount)
    throw new HttpError(409, "This couple is not eligible.");
  await c.query(
    "INSERT INTO votes(ticket_id,couple_id,session_id) VALUES($1,$2,$3)",
    [t.id, couple, t.session_id],
  );
  await c.query("UPDATE voting_tickets SET used_at=now() WHERE id=$1", [t.id]);
}
export const resultsSql = `SELECT c.id AS couple_id,count(v.id)::int AS votes FROM couple_applications c LEFT JOIN votes v ON v.couple_id=c.id AND v.session_id=(SELECT id FROM voting_sessions WHERE active) WHERE c.status='approved' GROUP BY c.id ORDER BY votes DESC,c.number`;
export const publicCouplesSql = `SELECT id,first_name,second_name,group_name,couple_name,photo_path,number,sort_order,status FROM couple_applications WHERE status='approved' ORDER BY sort_order,number`;
