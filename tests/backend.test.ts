import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { spawn, ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";
import { castVote, digest } from "../lib/server/operations";
let pg: EmbeddedPostgres;
let pool: Pool;
let server: ChildProcess;
let origin: string;
let cookie = "";
let serverOutput = "";
async function port() {
  const s = createServer();
  await new Promise<void>((resolve) => s.listen(0, "127.0.0.1", resolve));
  const p = (s.address() as { port: number }).port;
  await new Promise<void>((resolve) => s.close(() => resolve()));
  return p;
}
async function call(path: string, body?: unknown, session = false) {
  return fetch(origin + "/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      ...(session ? { Cookie: cookie } : {}),
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
}
async function action(name: string, args: unknown = {}) {
  const r = await call("admin/actions/" + name, args, true);
  assert.equal(r.status, 200, await r.clone().text());
  return r.json();
}
async function ticket() {
  return (await action("generate_tickets", { p_count: 1 }))[0] as string;
}
async function count() {
  return Number((await pool.query("SELECT count(*) n FROM votes")).rows[0].n);
}
before(
  async () => {
    const pgPort = await port();
    const webPort = await port();
    const pgPassword = randomBytes(20).toString("hex");
    origin = "http://127.0.0.1:" + webPort;
    pg = new EmbeddedPostgres({
      databaseDir: await mkdtemp(join(tmpdir(), "grand-ball-pg-")),
      user: "postgres",
      password: pgPassword,
      port: pgPort,
      persistent: false,
      initdbFlags: ["--locale=C", "--encoding=UTF8"],
      onLog: () => {},
      onError: () => {},
    });
    await pg.initialise();
    await pg.start();
    const client = pg.getPgClient();
    await client.connect();
    await client.query(
      await readFile(
        new URL("../database/migrations/001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
    await client.query(
      await readFile(
        new URL("../database/migrations/002_screen.sql", import.meta.url),
        "utf8",
      ),
    );
    await client.query(
      await readFile(
        new URL(
          "../database/migrations/003_program_schedule.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const salt = randomBytes(16).toString("hex");
    await client.query(
      "INSERT INTO admin_users(email,password_hash) VALUES($1,$2)",
      [
        "test@example.com",
        `scrypt:${salt}:${scryptSync("TestPassword123!", salt, 64).toString("hex")}`,
      ],
    );
    await client.end();
    const url = `postgresql://postgres:${pgPassword}@127.0.0.1:${pgPort}/postgres`;
    pool = new Pool({ connectionString: url });
    const appPassword = randomBytes(20).toString("hex");
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/create-app-role.mjs"], {
        env: {
          ...process.env,
          DATABASE_URL: url,
          POSTGRES_APP_PASSWORD: appPassword,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let error = "";
      child.stderr.on("data", (d) => (error += d));
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(Error(error)),
      );
    });
    const runtimeUrl = `postgresql://ball_app:${appPassword}@127.0.0.1:${pgPort}/postgres`;

    server = spawn(process.execPath, [".next/standalone/server.js"], {
      env: {
        ...process.env,
        DATABASE_URL: runtimeUrl,
        APP_ORIGIN: origin,
        NODE_ENV: "production",
        COOKIE_SECURE: "false",
        HOSTNAME: "127.0.0.1",
        PORT: String(webPort),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (d) => (serverOutput += d));
    server.stderr?.on("data", (d) => (serverOutput += d));
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(origin + "/api/health")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, "Next.js server did not start: " + serverOutput);
    const login = await call("auth/login", {
      email: "test@example.com",
      password: "TestPassword123!",
    });
    assert.equal(login.status, 200, await login.clone().text());
    cookie = login.headers.get("set-cookie")!.split(";")[0];
    assert.match(login.headers.get("set-cookie")!, /HttpOnly/i);
  },
  { timeout: 60000 },
);
after(async () => {
  if (server) {
    server.kill("SIGTERM");
    await new Promise<void>((r) => {
      if (server.exitCode !== null) return r();
      server.once("exit", () => r());
      setTimeout(() => {
        server.kill("SIGKILL");
        r();
      }, 3000).unref();
    });
  }
  await pool?.end();
  await pg?.stop();
});
let couple = "";
let photo = "";
test("private endpoints require a server session and reject cross-origin mutations", async () => {
  assert.equal((await call("admin/data")).status, 401);
  assert.equal(
    (await call("admin/actions/generate_tickets", { p_count: 1 })).status,
    401,
  );
  const bad = await fetch(origin + "/api/admin/actions/generate_tickets", {
    method: "POST",
    headers: {
      Origin: "https://attacker.invalid",
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: '{"p_count":1}',
  });
  assert.equal(bad.status, 403);
  const badLogin = await call("auth/login", {
    email: "test@example.com",
    password: "WrongPassword123",
  });
  assert.equal(badLogin.status, 401);
});
test("event starts at 16:00 and program intervals are saved and validated", async () => {
  const event = await (await call("event")).json();
  assert.equal(new Date(event.starts_at).getUTCHours(), 11);
  const program = await (await call("program")).json();
  assert.deepEqual(
    program.map((p: any) => [p.time, p.end_time, p.title]),
    [
      ["16:00", "17:00", "Вальс"],
      ["17:00", "18:30", "Дискотека және ойын-сауық бағдарламасы"],
    ],
  );
  await action("save_program", {
    p_items: program.map((p: any) => ({
      time: p.time,
      end_time: p.end_time,
      title: p.title,
      description: p.description,
      sort_order: p.sort_order,
    })),
  });
  const invalid = await call(
    "admin/actions/save_program",
    {
      p_items: [
        {
          time: "16:00",
          end_time: "15:00",
          title: "Invalid",
          description: "",
          sort_order: 0,
        },
      ],
    },
    true,
  );
  assert.equal(invalid.status, 400);
  assert.equal((await (await call("program")).json())[1].end_time, "18:30");
});
test("registration stores real application and private photo atomically", async () => {
  await action("set_event_state", {
    p_patch: {
      registration_open: true,
      registration_deadline: "2030-11-26T12:00:00+05:00",
    },
  });
  const form = new FormData();
  for (const [k, v] of Object.entries({
    first: "Alice",
    second: "Robert",
    group: "11 A",
    name: "Royal pair",
    contact: "private@example.com",
    consent: "on",
    rules: "on",
  }))
    form.set(k, v);
  const sharp = (await import("sharp")).default;
  form.set(
    "photo",
    new File(
      [
        new Uint8Array(
          await sharp({
            create: {
              width: 30,
              height: 30,
              channels: 3,
              background: "#ad8746",
            },
          })
            .png()
            .toBuffer(),
        ),
      ],
      "couple.png",
      { type: "image/png" },
    ),
  );
  const r = await call("register", form);
  assert.equal(r.status, 201, await r.clone().text());
  couple = (await r.json()).id;
  const row = (
    await pool.query("SELECT * FROM couple_applications WHERE id=$1", [couple])
  ).rows[0];
  assert.equal(row.status, "pending");
  photo = row.photo_path;
  assert.equal((await call("media/" + photo)).status, 404);
  assert.equal((await call("media/" + photo, undefined, true)).status, 200);
  assert.deepEqual(await (await call("couples")).json(), []);
  await action("moderate_couple", { p_id: couple, p_status: "approved" });
  const publicCouples = await (await call("couples")).json();
  assert.equal(publicCouples.length, 1);
  assert.equal(publicCouples[0].contact, undefined);
  assert.equal((await call("media/" + photo)).status, 200);
});
test("generated voting codes have four unambiguous characters and never repeat across batches", async () => {
  const first = (await action("generate_tickets", {
    p_count: 500,
  })) as string[];
  const second = (await action("generate_tickets", {
    p_count: 500,
  })) as string[];
  const codes = [...first, ...second];
  assert.equal(codes.length, 1000);
  assert.equal(new Set(codes).size, 1000);
  for (const code of codes)
    assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
});
test("validation and closed voting produce errors without recording votes", async () => {
  const code = await ticket();
  assert.equal((await call("vote", { code, couple })).status, 409);
  assert.equal((await call("vote", { code: "bad", couple })).status, 400);
  assert.equal(await count(), 0);
  assert.equal((await call("results")).status, 403);
  await action("set_event_state", { p_patch: { voting_status: "open" } });
  const refused = await call(
    "admin/actions/set_event_state",
    { p_patch: { results_published: true } },
    true,
  );
  assert.equal(refused.status, 409);
});
test("concurrent HTTP requests can redeem a ticket exactly once", async () => {
  const code = await ticket();
  const responses = await Promise.all(
    Array.from({ length: 6 }, () => call("vote", { code, couple })),
  );
  assert.equal(responses.filter((r) => r.status === 200).length, 1);
  assert.equal(responses.filter((r) => r.status === 409).length, 5);
  assert.equal(
    (await call("vote", { code: code.toLowerCase(), couple })).status,
    409,
  );
  assert.equal(await count(), 1);
  const row = (
    await pool.query(
      "SELECT token_hash,used_at FROM voting_tickets WHERE token_hash=$1",
      [digest(code)],
    )
  ).rows[0];
  assert.notEqual(row.token_hash, code);
  assert.ok(row.used_at);
});
test("projector leaderboard is separately authorized by the organizer", async () => {
  let screen = await (await call("screen")).json();
  assert.equal(screen.visible, false);
  assert.deepEqual(screen.leaders, []);
  assert.equal(screen.total_votes, 0);
  assert.equal(
    (
      await call("admin/actions/set_event_state", {
        p_patch: { screen_results_visible: true },
      })
    ).status,
    401,
  );
  await action("set_event_state", {
    p_patch: { screen_results_visible: true },
  });
  screen = await (await call("screen")).json();
  assert.equal(screen.visible, true);
  assert.equal(screen.total_votes, 1);
  assert.equal(screen.leaders[0].id, couple);
  assert.equal(screen.leaders[0].votes, 1);
  assert.equal(screen.leaders[0].contact, undefined);
  assert.equal((await call("results")).status, 403);
  await action("set_event_state", {
    p_patch: { screen_results_visible: false },
  });
  assert.deepEqual((await (await call("screen")).json()).leaders, []);
});
test("revocation and transaction rollback preserve ticket integrity", async () => {
  const code = await ticket();
  const id = (
    await pool.query("SELECT id FROM voting_tickets WHERE token_hash=$1", [
      digest(code),
    ])
  ).rows[0].id;
  await action("revoke_ticket", { p_id: id });
  assert.equal((await call("vote", { code, couple })).status, 409);
  const reusable = await ticket();
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await castVote(c, reusable, couple);
    await c.query("ROLLBACK");
  } finally {
    c.release();
  }
  assert.equal(await count(), 1);
  assert.equal((await call("vote", { code: reusable, couple })).status, 200);
  assert.equal(await count(), 2);
});
test("manual couple photo upload and explicit tie-break use validated tied leaders", async () => {
  await action("admin_save_couple", {
    p_id: null,
    p_data: {
      first_name: "Second",
      second_name: "Couple",
      group_name: "11 B",
      couple_name: "",
      contact: "second@example.com",
      sort_order: 1,
    },
  });
  const second = (
    await pool.query(
      "SELECT id FROM couple_applications WHERE first_name='Second'",
    )
  ).rows[0].id;
  const bytes = await (await call("media/" + photo)).arrayBuffer();
  const form = new FormData();
  form.set("kind", "couple");
  form.set("couple", second);
  form.set("photo", new File([bytes], "second.webp", { type: "image/webp" }));
  assert.equal((await call("upload", form, true)).status, 201);
  await action("moderate_couple", { p_id: second, p_status: "approved" });
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await call("vote", { code: await ticket(), couple: second })).status,
      200,
    );
  await action("set_event_state", { p_patch: { voting_status: "closed" } });
  assert.equal(
    (
      await call(
        "admin/actions/set_tiebreak",
        { p_couple: couple, p_reason: "short" },
        true,
      )
    ).status,
    400,
  );
  await action("set_tiebreak", {
    p_couple: couple,
    p_reason: "Announced jury dance-off, first couple selected by the jury.",
  });
  assert.equal((await (await call("event")).json()).tie_winner, null);
  await action("set_event_state", { p_patch: { voting_status: "open" } });
  // Reopening clears a previous tie-break; choose again only once voting is closed.
  assert.equal(
    (await pool.query("SELECT tie_winner FROM event_settings")).rows[0]
      .tie_winner,
    null,
  );
  await action("set_event_state", { p_patch: { voting_status: "closed" } });
  await action("set_tiebreak", {
    p_couple: couple,
    p_reason: "Announced jury dance-off, first couple selected by the jury.",
  });
  await action("set_event_state", { p_patch: { voting_status: "open" } });
});
test("winner announcement uses validated totals and hides results until publication", async () => {
  assert.equal((await call("winners")).status, 403);
  assert.equal(
    (await call("admin/actions/announce_winners", {}, true)).status,
    409,
  );
  await action("set_event_state", { p_patch: { voting_status: "closed" } });
  await action("set_tiebreak", {
    p_couple: couple,
    p_reason: "Announced jury dance-off, first couple selected by the jury.",
  });
  await action("announce_winners");
  const winners = await (await call("winners")).json();
  assert.equal(winners[0].id, couple);
  const results = await (await call("results")).json();
  assert.equal(results[0].votes, 2);
  assert.equal(
    (
      await call(
        "admin/actions/set_event_state",
        { p_patch: { voting_status: "open" } },
        true,
      )
    ).status,
    409,
  );
  const snapshot = await (await call("admin/data", undefined, true)).json();
  assert.equal(snapshot.tickets[0].token_hash, undefined);
  const logs = (await pool.query("SELECT * FROM audit_log")).rows;
  assert.ok(logs.some((r) => r.action === "announce_winners"));
  assert.ok(!JSON.stringify(logs).includes("TestPassword123!"));
});
test("logout revokes session server-side", async () => {
  assert.equal((await call("auth/logout", {}, true)).status, 200);
  assert.equal((await call("admin/data", undefined, true)).status, 401);
});
