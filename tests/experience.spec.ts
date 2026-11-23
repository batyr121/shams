import { test, expect } from "@playwright/test";
import { defaults } from "../lib/db";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (r) =>
    r.fulfill({ status: 503, json: { configured: false } }),
  );
  await page.route("**/api/event", (r) =>
    r.fulfill({
      json: { ...defaults, registration_deadline: "2030-11-26T12:00:00+05:00" },
    }),
  );
  await page.route("**/api/couples", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/screen", (r) =>
    r.fulfill({
      json: {
        visible: false,
        voting_status: "closed",
        total_votes: 0,
        leaders: [],
      },
    }),
  );
});
test("invitation opens and all primary destinations work", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "БАЛҒА ҚОШ КЕЛДІҢІЗ", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "БАЛҒА ҚОШ КЕЛДІҢІЗ", exact: true })
    .click();
  await expect(page.locator(".intro")).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(".hero h1")).toHaveText(
    "ШәмшіҚайырымдылық Балы2026",
  );
  await page.locator("#about").scrollIntoViewIfNeeded();
  await expect(page.locator(".about-copy")).toHaveCSS("opacity", "1");
  for (
    let y = 0;
    y < (await page.evaluate(() => document.body.scrollHeight));
    y += 600
  ) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1100);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `/tmp/ball-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".hero-actions")
    .first()
    .getByRole("link", { name: "ЖҰП БОЛЫП ТІРКЕЛУ", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "ӨТІНІМ ЖІБЕРУ" }),
  ).toBeDisabled();
  await expect(page.locator("input[type=file]")).toHaveAttribute(
    "required",
    "",
  );
  expect(errors).toEqual([]);
});
test("voting and admin do not fake live operations", async ({ page }) => {
  await page.goto("/vote");
  await expect(
    page.getByText("The royal line-up is on its way."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ДАУЫС БЕРУ", exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin");
  await expect(page.getByRole("button", { name: "КІРУ" })).toBeDisabled();
  await expect(
    page.getByText("Ұйымдастырушы бөліміне кіру үшін", { exact: false }),
  ).toBeVisible();
});
test("QR presentation renders readable QR and winner waits for authorization", async ({
  page,
}) => {
  await page.goto("/screen/qr");
  await expect(
    page.getByAltText(
      "Дауыс беруге арналған QR-код — Шәмші Қайырымдылық Балы 2026",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choose Your KING & QUEEN" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/screen/winner");
  await expect(
    page.getByText("Кештің KING & QUEEN жұбын бірге қарсы алайық."),
  ).toBeVisible();
  await expect(page.locator(".winner-photo")).toHaveCount(0);
});
test("reduced motion skips introduction", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".intro")).toHaveCount(0);
  await expect(page.locator(".hero h1")).toBeVisible();
});
