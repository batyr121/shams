// Local development runner: persistent PostgreSQL, migrations, organizer, Next.js.
import EmbeddedPostgres from "embedded-postgres";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { networkInterfaces } from "node:os";
const root = process.cwd();
await mkdir(".data", { recursive: true, mode: 0o700 });
let config;
try {
  config = JSON.parse(await readFile(".data/local-settings.json", "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  config = {
    owner: randomBytes(24).toString("hex"),
    app: randomBytes(24).toString("hex"),
    admin: randomBytes(18).toString("hex"),
    email: "organizer@example.com",
    pgPort: 55432,
    webPort: 3000,
  };
  await writeFile(".data/local-settings.json", JSON.stringify(config), {
    mode: 0o600,
    flag: "wx",
  });
}
const origin = `http://localhost:${config.webPort}`;
const interfaces = networkInterfaces();
const lan = Object.entries(interfaces)
  .sort(([a], [b]) => Number(!a.startsWith("en")) - Number(!b.startsWith("en")))
  .flatMap(([, entries]) => entries || [])
  .find(
    (i) =>
      i.family === "IPv4" &&
      !i.internal &&
      /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(i.address),
  );
const networkOrigin = lan ? `http://${lan.address}:${config.webPort}` : origin;
const appUrl = `postgresql://ball_app:${config.app}@127.0.0.1:${config.pgPort}/grand_ball`;
try {
  await access(".env.local");
  process.loadEnvFile(".env.local");
  if (process.env.DATABASE_URL !== appUrl)
    throw Error(
      "An existing .env.local uses another database. Start with npm run dev, or move that configuration before using the local database runner.",
    );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  await writeFile(
    ".env.local",
    `DATABASE_URL=${appUrl}\nAPP_ORIGIN=${origin}\nCOOKIE_SECURE=false\nADMIN_EMAIL=${config.email}\nADMIN_PASSWORD=${config.admin}\n`,
    { mode: 0o600, flag: "wx" },
  );
}
async function available(port) {
  const server = createServer();
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolve);
    });
    await new Promise((resolve) => server.close(resolve));
  } catch {
    throw Error(
      `Port ${port} is already occupied. Do not start a second local runner.`,
    );
  }
}
await available(config.pgPort);
await available(config.webPort);
const postgres = new EmbeddedPostgres({
  databaseDir: resolve(root, ".data/postgres"),
  user: "ball_owner",
  password: config.owner,
  port: config.pgPort,
  persistent: true,
  authMethod: "scram-sha-256",
  initdbFlags: ["--locale=C", "--encoding=UTF8"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
let started = false;
let app;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  if (app && app.exitCode === null) {
    app.kill("SIGTERM");
    await new Promise((resolve) => {
      app.once("exit", resolve);
      setTimeout(resolve, 5000).unref();
    });
  }
  if (started) await postgres.stop();
}
process.once("SIGINT", () => {
  stop().finally(() => process.exit(0));
});
process.once("SIGTERM", () => {
  stop().finally(() => process.exit(0));
});
async function run(file, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error("Local database setup failed.")),
    );
  });
}
try {
  try {
    await access(".data/postgres/PG_VERSION");
  } catch {
    console.log("Initializing persistent local PostgreSQL…");
    await postgres.initialise();
  }
  await postgres.start();
  started = true;
  const connection = postgres.getPgClient("postgres", "127.0.0.1");
  await connection.connect();
  const exists = await connection.query(
    "SELECT 1 FROM pg_database WHERE datname='grand_ball'",
  );
  await connection.end();
  if (!exists.rowCount) await postgres.createDatabase("grand_ball");
  const ownerUrl = `postgresql://ball_owner:${config.owner}@127.0.0.1:${config.pgPort}/grand_ball`;
  const setupEnv = {
    DATABASE_URL: ownerUrl,
    POSTGRES_APP_PASSWORD: config.app,
    ADMIN_EMAIL: config.email,
    ADMIN_PASSWORD: config.admin,
  };
  await run("scripts/migrate.mjs", setupEnv);
  await run("scripts/create-app-role.mjs", setupEnv);
  const check = postgres.getPgClient("grand_ball", "127.0.0.1");
  await check.connect();
  const adminExists = await check.query(
    "SELECT 1 FROM admin_users WHERE email=$1",
    [config.email],
  );
  await check.end();
  if (!adminExists.rowCount) await run("scripts/create-admin.mjs", setupEnv);
  console.log(
    `PostgreSQL is ready. Organizer credentials: .env.local (kept private).\nWebsite: ${origin}\nAdministrator: ${origin}/admin\nPhone QR (same Wi-Fi): ${networkOrigin}/vote`,
  );
  app = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "--hostname",
      "0.0.0.0",
      "--port",
      String(config.webPort),
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: appUrl,
        APP_ORIGIN: origin,
        PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || networkOrigin,
        LOCAL_NETWORK_ORIGIN: networkOrigin,
        COOKIE_SECURE: "false",
      },
      stdio: "inherit",
    },
  );
  await new Promise((resolve, reject) => {
    app.on("error", reject);
    app.on("exit", resolve);
  });
} finally {
  await stop();
}
