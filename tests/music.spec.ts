import { test, expect } from "@playwright/test";
test("music starts on invitation entry, pauses on request, and stays off in admin", async ({
  page,
}) => {
  await page.goto("/");
  const audio = page.locator("audio");
  await expect(audio).toHaveCount(1);
  expect(await audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await page
    .getByRole("button", { name: "БАЛҒА ҚОШ КЕЛДІҢІЗ", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Музыканы өшіру", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  expect(
    await audio.evaluate((a: HTMLAudioElement) => a.duration),
  ).toBeGreaterThan(60);
  await page
    .locator(".hero-actions")
    .first()
    .getByRole("link", { name: "ЖҰП БОЛЫП ТІРКЕЛУ", exact: true })
    .click();
  await expect(page).toHaveURL(/register-couple/);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(false);
  await page
    .getByRole("button", { name: "Музыканы өшіру", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Музыканы қосу", exact: true }),
  ).toBeVisible();
  expect(await audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await page.reload();
  expect(await audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await page
    .getByRole("button", { name: "Музыканы қосу", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Музыканы өшіру", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Ұйымдастырушыға кіру", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Музыканы өшіру", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(true);
});
test("presentation does not display or play site music", async ({ page }) => {
  await page.goto("/screen/qr");
  await expect(page.locator(".music-player")).toHaveCount(0);
  expect(
    await page.locator("audio").evaluate((a: HTMLAudioElement) => a.paused),
  ).toBe(true);
});
