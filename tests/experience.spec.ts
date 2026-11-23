import { test, expect } from "@playwright/test";
test("invitation opens and all primary destinations work", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "ENTER THE BALL", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ENTER THE BALL", exact: true })
    .click();
  await expect(page.locator(".intro")).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(".hero h1")).toHaveText("THEGRAND BALL");
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
    .getByRole("link", { name: "РЕГИСТРАЦИЯ ПАР", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "SUBMIT APPLICATION" }),
  ).toBeDisabled();
  await expect(page.locator("input[type=file]")).toBeVisible();
  expect(errors).toEqual([]);
});
test("voting and admin do not fake live operations", async ({ page }) => {
  await page.goto("/vote");
  await expect(
    page.getByText("The royal line-up is on its way."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ГОЛОСОВАТЬ", exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin");
  await expect(
    page.getByRole("button", { name: "SIGN IN SECURELY" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Connect Supabase", { exact: false }),
  ).toBeVisible();
});
test("QR presentation renders readable QR and winner waits for authorization", async ({
  page,
}) => {
  await page.goto("/screen/qr");
  await expect(
    page.getByAltText("Scan to open the Grand Ball voting page"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "ГОТОВЬТЕСЬ ГОЛОСОВАТЬ" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/screen/winner");
  await expect(page.getByText("The crown awaits.")).toBeVisible();
  await expect(page.locator(".winner-photo")).toHaveCount(0);
});
test("reduced motion skips introduction", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".intro")).toHaveCount(0);
  await expect(page.locator(".hero h1")).toBeVisible();
});
