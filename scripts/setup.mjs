import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
const owner = randomBytes(24).toString("hex"),
  app = randomBytes(24).toString("hex"),
  admin = randomBytes(18).toString("hex");
const content = `DATABASE_URL=postgresql://ball_app:${app}@localhost:5432/grand_ball\nAPP_ORIGIN=http://localhost:3000\nCOOKIE_SECURE=false\nPOSTGRES_ADMIN_PASSWORD=${owner}\nPOSTGRES_APP_PASSWORD=${app}\nADMIN_EMAIL=organizer@example.com\nADMIN_PASSWORD=${admin}\n`;
try {
  await writeFile(".env", content, { flag: "wx", mode: 0o600 });
  console.log(
    "Created private .env with generated passwords. Set ADMIN_EMAIL and review APP_ORIGIN before starting Docker. Organizer credentials are in .env.",
  );
} catch (e) {
  if (e.code === "EEXIST")
    console.log(".env already exists; no settings were overwritten.");
  else throw e;
}
