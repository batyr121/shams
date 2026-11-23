import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { PoolClient } from "pg";
import { HttpError, transaction } from "./database";
import { digest, resultsSql } from "./operations";
const uuid = z.string().uuid();
const coupleSchema = z.object({
  first_name: z.string().trim().min(2).max(80),
  second_name: z.string().trim().min(2).max(80),
  group_name: z.string().trim().min(1).max(40),
  couple_name: z.string().trim().max(80).default(""),
  contact: z.string().trim().min(3).max(160),
  sort_order: z.number().int().min(0).max(10000),
});
const stateSchema = z
  .object({
    starts_at: z.string().datetime({ offset: true }).optional(),
    location: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    dress_code: z.string().trim().min(1).max(200).optional(),
    registration_deadline: z.string().datetime({ offset: true }).optional(),
    registration_open: z.boolean().optional(),
    voting_status: z.enum(["open", "paused", "closed"]).optional(),
    results_published: z.boolean().optional(),
    screen_results_visible: z.boolean().optional(),
  })
  .strict();
export async function audit(
  c: Pick<PoolClient, "query">,
  actor: string,
  action: string,
  details: unknown = {},
) {
  await c.query(
    "INSERT INTO audit_log(actor,action,details) VALUES($1,$2,$3)",
    [actor, action, JSON.stringify(details)],
  );
}
export async function adminAction(
  name: string,
  args: Record<string, unknown>,
  actor: string,
) {
  return transaction(async (c) => {
    let data: unknown = null;
    // Shared settings lock serializes state changes with voting and winner publication.
    const settings = (
      await c.query("SELECT * FROM event_settings WHERE id=1 FOR UPDATE")
    ).rows[0];
    switch (name) {
      case "set_event_state": {
        const p = stateSchema.parse(args.p_patch);
        if (p.results_published && settings.voting_status !== "closed")
          throw new HttpError(409, "Close voting before publishing results.");
        if (
          p.voting_status &&
          p.voting_status !== "closed" &&
          settings.reveal_at
        )
          throw new HttpError(409, "The winner announcement is final.");
        const entries = Object.entries(p);
        if (entries.length)
          await c.query(
            `UPDATE event_settings SET ${entries.map(([k], i) => `"${k}"=$${i + 1}`).join(",")} WHERE id=1`,
            entries.map(([, v]) => v),
          );
        if (p.voting_status && p.voting_status !== "closed")
          await c.query(
            "UPDATE event_settings SET results_published=false,tie_winner=NULL,tie_procedure=NULL WHERE id=1",
          );
        break;
      }
      case "admin_save_couple": {
        const p = coupleSchema.parse(args.p_data);
        const vals = [
          p.first_name,
          p.second_name,
          p.group_name,
          p.couple_name,
          p.contact,
          p.sort_order,
        ];
        if (args.p_id) {
          const id = uuid.parse(args.p_id);
          const r = await c.query(
            "UPDATE couple_applications SET first_name=$1,second_name=$2,group_name=$3,couple_name=$4,contact=$5,sort_order=$6 WHERE id=$7 RETURNING id",
            [...vals, id],
          );
          if (!r.rowCount) throw new HttpError(404, "Couple not found.");
        } else {
          await c.query(
            "INSERT INTO couple_applications(first_name,second_name,group_name,couple_name,contact,sort_order,consent) VALUES($1,$2,$3,$4,$5,$6,true)",
            vals,
          );
        }
        break;
      }
      case "moderate_couple": {
        const id = uuid.parse(args.p_id);
        const status = z.enum(["approved", "rejected"]).parse(args.p_status);
        if (settings.reveal_at)
          throw new HttpError(409, "Competition has already been announced.");
        const row = (
          await c.query(
            "SELECT * FROM couple_applications WHERE id=$1 FOR UPDATE",
            [id],
          )
        ).rows[0];
        if (!row) throw new HttpError(404, "Couple not found.");
        if (status === "approved" && !row.photo_path)
          throw new HttpError(
            409,
            "Upload the participant-approved photograph first.",
          );
        if (
          status === "rejected" &&
          (
            await c.query("SELECT 1 FROM votes WHERE couple_id=$1 LIMIT 1", [
              id,
            ])
          ).rowCount
        )
          throw new HttpError(
            409,
            "A couple with validated votes cannot be rejected.",
          );
        await c.query(
          "UPDATE couple_applications SET status=$1,number=CASE WHEN $1='approved' THEN coalesce(number,nextval('couple_number')) ELSE number END WHERE id=$2",
          [status, id],
        );
        break;
      }
      case "delete_couple": {
        const id = uuid.parse(args.p_id);
        if (
          (
            await c.query("SELECT 1 FROM votes WHERE couple_id=$1 LIMIT 1", [
              id,
            ])
          ).rowCount
        )
          throw new HttpError(409, "A couple with votes cannot be deleted.");
        const r = await c.query("DELETE FROM couple_applications WHERE id=$1", [
          id,
        ]);
        if (!r.rowCount) throw new HttpError(404, "Couple not found.");
        break;
      }
      case "generate_tickets": {
        const count = z.number().int().min(1).max(500).parse(args.p_count);
        const sid = (
          await c.query("SELECT id FROM voting_sessions WHERE active")
        ).rows[0]?.id;
        if (!sid)
          throw new HttpError(409, "There is no active voting session.");
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
          const code = randomBytes(10).toString("hex").toUpperCase();
          await c.query(
            "INSERT INTO voting_tickets(session_id,token_hash) VALUES($1,$2)",
            [sid, digest(code)],
          );
          codes.push(code);
        }
        data = codes;
        break;
      }
      case "revoke_ticket": {
        const id = uuid.parse(args.p_id);
        const r = await c.query(
          "UPDATE voting_tickets SET revoked=true WHERE id=$1 AND used_at IS NULL AND NOT revoked",
          [id],
        );
        if (!r.rowCount)
          throw new HttpError(
            409,
            "Ticket was redeemed, revoked, or not found.",
          );
        break;
      }
      case "set_tiebreak": {
        const id = uuid.parse(args.p_couple);
        const reason = z.string().trim().min(15).max(1000).parse(args.p_reason);
        if (settings.voting_status !== "closed" || settings.reveal_at)
          throw new HttpError(
            409,
            "Close voting and resolve the tie before announcing.",
          );
        const rows = (await c.query(resultsSql)).rows;
        const max = Math.max(0, ...rows.map((r) => r.votes));
        const leaders = rows.filter((r) => r.votes === max);
        if (
          max === 0 ||
          leaders.length < 2 ||
          !leaders.some((r) => r.couple_id === id)
        )
          throw new HttpError(409, "Select a tied first-place couple.");
        await c.query(
          "UPDATE event_settings SET tie_winner=$1,tie_procedure=$2 WHERE id=1",
          [id, reason],
        );
        break;
      }
      case "announce_winners": {
        if (settings.voting_status !== "closed" || settings.reveal_at)
          throw new HttpError(
            409,
            "Close voting before announcing, and announce only once.",
          );
        const rows = (await c.query(resultsSql)).rows;
        if (!rows.some((r) => r.votes > 0))
          throw new HttpError(409, "There are no validated votes.");
        await c.query(
          "UPDATE event_settings SET results_published=true,reveal_at=now() WHERE id=1",
        );
        break;
      }
      case "save_program": {
        const items = z
          .array(
            z
              .object({
                time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
                end_time: z
                  .string()
                  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
                  .nullable()
                  .optional()
                  .default(null),
                title: z.string().trim().min(1).max(100),
                description: z.string().max(500),
                sort_order: z.number().int().min(0),
              })
              .refine((p) => !p.end_time || p.end_time > p.time, {
                message: "Аяқталу уақыты басталу уақытынан кейін болуы керек.",
              }),
          )
          .max(50)
          .parse(args.p_items);
        await c.query("DELETE FROM event_program");
        for (const p of items)
          await c.query(
            "INSERT INTO event_program(time,end_time,title,description,sort_order) VALUES($1,$2,$3,$4,$5)",
            [p.time, p.end_time, p.title, p.description, p.sort_order],
          );
        break;
      }
      case "add_gallery": {
        const id = uuid.parse(args.p_path);
        const caption = z.string().trim().min(1).max(200).parse(args.p_caption);
        const r = await c.query(
          "INSERT INTO gallery_images(media_id,caption) SELECT id,$2 FROM media WHERE id=$1 AND kind='gallery' RETURNING id",
          [id, caption],
        );
        if (!r.rowCount) throw new HttpError(400, "Photograph not uploaded.");
        break;
      }
      case "delete_gallery": {
        const id = uuid.parse(args.p_id);
        const r = await c.query(
          "DELETE FROM media WHERE id=(SELECT media_id FROM gallery_images WHERE id=$1)",
          [id],
        );
        if (!r.rowCount) throw new HttpError(404, "Photo not found.");
        break;
      }
      default:
        throw new HttpError(404, "Unknown administrative operation.");
    }
    // Never write plaintext guest codes or passwords to the audit log.
    await audit(
      c,
      actor,
      name,
      name === "generate_tickets" ? { count: args.p_count } : args,
    );
    return data;
  });
}
