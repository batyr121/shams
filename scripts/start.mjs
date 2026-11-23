try {
  process.loadEnvFile(".env.local");
} catch {}
process.env.HOSTNAME = "0.0.0.0";
await import("../.next/standalone/server.js");
