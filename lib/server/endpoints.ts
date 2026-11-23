import { z, ZodError } from "zod";
import { query, transaction, HttpError, failure, json } from "./database";
import {
  admin,
  requireAdmin,
  sameOrigin,
  limit,
  passwordMatches,
  startSession,
  hash,
} from "./auth";
import { castVote, publicCouplesSql, resultsSql } from "./operations";
import { adminAction, audit } from "./actions";
import { imageData, formData } from "./media";
import { cookies } from "next/headers";
const uid = z.string().uuid();
const gallerySql =
  "SELECT id,'/api/media/'||media_id AS url,caption,sort_order FROM gallery_images ORDER BY sort_order,id";
export async function endpoint(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ZodError)
      return json({ error: e.issues[0]?.message || "Invalid input." }, 400);
    return failure(e);
  }
}
async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "JSON body is required.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      total += item.value.length;
      if (total > 32768) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large.");
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export async function publicRead(kind: string) {
  if (kind === "health") {
    try {
      await query("SELECT 1 FROM event_settings WHERE id=1");
      return json({ configured: true });
    } catch {
      return json({ configured: false }, 503);
    }
  }
  if (kind === "event") {
    const row = (
      await query(
        "SELECT id,starts_at,location,description,dress_code,registration_open,registration_deadline,voting_status,results_published,screen_results_visible,reveal_at,NULL AS tie_winner FROM event_settings WHERE id=1",
      )
    ).rows[0];
    const base = process.env.PUBLIC_SITE_URL || process.env.APP_ORIGIN;
    return json({
      ...row,
      voting_url: base ? new URL("/vote", base).href : "",
    });
  }
  if (kind === "screen")
    return transaction(async (c) => {
      const settings = (
        await c.query(
          "SELECT screen_results_visible,voting_status FROM event_settings WHERE id=1 FOR SHARE",
        )
      ).rows[0];
      if (!settings.screen_results_visible)
        return json({
          visible: false,
          voting_status: settings.voting_status,
          total_votes: 0,
          leaders: [],
        });
      const results = (await c.query(resultsSql)).rows;
      const couples = (await c.query(publicCouplesSql)).rows;
      const total = results.reduce((n, r) => n + r.votes, 0);
      const leaders = results
        .filter((r) => r.votes > 0)
        .slice(0, 3)
        .map((r) => ({
          ...couples.find((c) => c.id === r.couple_id),
          votes: r.votes,
          percentage: total ? Math.round((r.votes / total) * 100) : 0,
          rank: 1 + results.filter((x) => x.votes > r.votes).length,
        }));
      return json({
        visible: true,
        voting_status: settings.voting_status,
        total_votes: total,
        leaders,
      });
    });
  if (kind === "couples") return json((await query(publicCouplesSql)).rows);
  if (kind === "program")
    return json(
      (await query("SELECT * FROM event_program ORDER BY sort_order,id")).rows,
    );
  if (kind === "gallery") return json((await query(gallerySql)).rows);
  if (kind === "results" || kind === "winners")
    return transaction(async (c) => {
      const s = (
        await c.query(
          "SELECT results_published,reveal_at,tie_winner FROM event_settings WHERE id=1 FOR SHARE",
        )
      ).rows[0];
      if (!s.results_published)
        throw new HttpError(403, "Results have not been published.");
      const results = (await c.query(resultsSql)).rows;
      if (kind === "results") return json(results);
      if (!s.reveal_at) return json([]);
      const highest = Math.max(0, ...results.map((r) => r.votes));
      const ids = results
        .filter(
          (r) =>
            r.votes === highest &&
            highest > 0 &&
            (!s.tie_winner || s.tie_winner === r.couple_id),
        )
        .map((r) => r.couple_id);
      return json(
        (
          await c.query(
            `SELECT * FROM (${publicCouplesSql}) c WHERE id=ANY($1::uuid[])`,
            [ids],
          )
        ).rows,
      );
    });
  throw new HttpError(404, "Not found.");
}
export async function register(request: Request) {
  sameOrigin(request);
  const form = await formData(request);
  const input = z
    .object({
      first: z.string().trim().min(2).max(80),
      second: z.string().trim().min(2).max(80),
      group: z.string().trim().min(1).max(40),
      name: z.string().trim().max(80),
      contact: z.string().trim().min(3).max(160),
      consent: z.literal("on"),
      rules: z.literal("on"),
    })
    .parse(Object.fromEntries(form));
  await limit("registration:" + input.contact.toLowerCase(), 3, 600);
  const image = await imageData(form.get("photo"));
  return transaction(async (c) => {
    const s = (
      await c.query(
        "SELECT registration_open,registration_deadline FROM event_settings WHERE id=1 FOR SHARE",
      )
    ).rows[0];
    if (!s.registration_open || new Date(s.registration_deadline) < new Date())
      throw new HttpError(409, "Registration is closed.");
    const r = await c.query(
      "INSERT INTO couple_applications(first_name,second_name,group_name,couple_name,contact,consent) VALUES($1,$2,$3,$4,$5,true) RETURNING id",
      [input.first, input.second, input.group, input.name, input.contact],
    );
    const id = r.rows[0].id;
    const media = await c.query(
      "INSERT INTO media(couple_id,kind,content,mime) VALUES($1,'couple',$2,'image/webp') RETURNING id",
      [id, image],
    );
    await c.query("UPDATE couple_applications SET photo_path=$1 WHERE id=$2", [
      media.rows[0].id,
      id,
    ]);
    return json({ id }, 201);
  });
}
export async function vote(request: Request) {
  sameOrigin(request);
  const v = z
    .object({
      code: z
        .string()
        .trim()
        .regex(
          /^[a-fA-F0-9]{20}$/,
          "Enter the 20-character code on your ticket.",
        ),
      couple: z.string().uuid(),
    })
    .parse(await body(request));
  await limit("vote:" + v.code.toUpperCase(), 12, 60);
  await transaction((c) => castVote(c, v.code, v.couple));
  return json({ ok: true });
}
export async function login(request: Request) {
  sameOrigin(request);
  const v = z
    .object({
      email: z
        .string()
        .email()
        .max(200)
        .transform((s) => s.toLowerCase()),
      password: z.string().min(8).max(256),
    })
    .parse(await body(request));
  await limit("login:" + v.email, 8, 900);
  const user = (
    await query(
      "SELECT id,password_hash FROM admin_users WHERE email=$1 AND role='admin'",
      [v.email],
    )
  ).rows[0];
  const fallback = "scrypt:00000000000000000000000000000000:" + "0".repeat(128);
  const ok = await passwordMatches(v.password, user?.password_hash || fallback);
  if (!user || !ok) throw new HttpError(401, "Invalid email or password.");
  await startSession(user.id);
  await transaction((c) => audit(c, user.id, "admin_login"));
  return json({ user: { id: user.id, email: v.email } });
}
export async function logout(request: Request) {
  sameOrigin(request);
  const store = await cookies();
  const token = store.get("ball_session")?.value;
  if (token)
    await query("DELETE FROM admin_sessions WHERE token_hash=$1", [
      hash(token),
    ]);
  store.delete("ball_session");
  return json({ ok: true });
}
export async function session() {
  return json({ user: await admin() });
}
export async function adminData() {
  await requireAdmin();
  return transaction(async (c) => {
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const couples = (
      await c.query(
        "SELECT id,first_name,second_name,group_name,couple_name,contact,photo_path,status,number,sort_order FROM couple_applications ORDER BY sort_order,created_at",
      )
    ).rows;
    const settings = (await c.query("SELECT * FROM event_settings WHERE id=1"))
      .rows[0];
    const results = (await c.query(resultsSql)).rows;
    const tickets = (
      await c.query(
        "SELECT id,used_at,revoked FROM voting_tickets ORDER BY created_at DESC",
      )
    ).rows;
    const program = (
      await c.query("SELECT * FROM event_program ORDER BY sort_order,id")
    ).rows;
    const gallery = (await c.query(gallerySql)).rows;
    return json({ couples, settings, results, tickets, program, gallery });
  });
}
export async function action(request: Request, name: string) {
  sameOrigin(request);
  const user = await requireAdmin();
  const args = z.record(z.string(), z.unknown()).parse(await body(request));
  return json(await adminAction(name, args, user.id));
}
export async function upload(request: Request) {
  sameOrigin(request);
  const user = await requireAdmin();
  const form = await formData(request);
  const kind = z.enum(["couple", "gallery"]).parse(form.get("kind"));
  const couple = kind === "couple" ? uid.parse(form.get("couple")) : null;
  const image = await imageData(form.get("photo"));
  return transaction(async (c) => {
    if (
      couple &&
      !(
        await c.query(
          "SELECT id FROM couple_applications WHERE id=$1 FOR UPDATE",
          [couple],
        )
      ).rowCount
    )
      throw new HttpError(404, "Couple not found.");
    const r = await c.query(
      "INSERT INTO media(couple_id,kind,content,mime) VALUES($1,$2,$3,'image/webp') RETURNING id",
      [couple, kind, image],
    );
    const id = r.rows[0].id;
    if (couple)
      await c.query(
        "UPDATE couple_applications SET photo_path=$1 WHERE id=$2",
        [id, couple],
      );
    await audit(c, user.id, "upload_photo", { kind, couple, id });
    return json({ path: id }, 201);
  });
}
export async function media(id: string) {
  uid.parse(id);
  const user = await admin();
  const r = await query(
    `SELECT m.content,m.mime FROM media m LEFT JOIN couple_applications c ON c.id=m.couple_id WHERE m.id=$1 AND ($2::boolean OR (m.kind='couple' AND c.status='approved' AND c.photo_path=m.id::text) OR (m.kind='gallery' AND EXISTS(SELECT 1 FROM gallery_images g WHERE g.media_id=m.id)))`,
    [id, Boolean(user)],
  );
  if (!r.rowCount) throw new HttpError(404, "Photograph not found.");
  return new Response(new Uint8Array(r.rows[0].content), {
    headers: {
      "Content-Type": r.rows[0].mime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
