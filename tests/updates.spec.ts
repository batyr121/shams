import { test, expect } from "@playwright/test";
import { defaults } from "../lib/db";
const pair = {
  id: "11111111-1111-4111-8111-111111111111",
  first_name: "Айдана",
  second_name: "Әлихан",
  group_name: "11 А",
  couple_name: "",
  photo_path: "test-photo",
  status: "approved",
  number: 1,
  sort_order: 0,
};
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (r) =>
    r.fulfill({ json: { configured: true } }),
  );
  await page.route("**/api/event", (r) =>
    r.fulfill({
      json: {
        ...defaults,
        registration_deadline: "2030-11-26T12:00:00+05:00",
        voting_status: "open",
        voting_url: "http://192.168.100.150:3000/vote",
      },
    }),
  );
  await page.route("**/api/media/test-photo", (r) =>
    r.fulfill({
      path: "public/images/ballroom.jpg",
      contentType: "image/jpeg",
    }),
  );
});
test("registration offers a required photograph with a working preview", async ({
  page,
}) => {
  await page.goto("/register-couple");
  const input = page.locator("#couple-photo");
  await expect(input).toHaveAttribute("required", "");
  await input.setInputFiles("public/images/ballroom.jpg");
  await expect(
    page.getByAltText("Жұбыңыздың фотосуретін алдын ала қарау"),
  ).toBeVisible();
  await expect(page.locator(".photo-preview")).toContainText("ballroom.jpg");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("QR destination shows couple photographs and submits the selected ticket vote", async ({
  page,
}) => {
  await page.route("**/api/couples", (r) => r.fulfill({ json: [pair] }));
  let submitted: unknown;
  await page.route("**/api/vote", async (r) => {
    submitted = r.request().postDataJSON();
    await r.fulfill({ json: { ok: true } });
  });
  await page.goto("/vote");
  await expect(page.getByAltText("Айдана and Әлихан")).toBeVisible();
  await page.locator("#guest-code").fill("a7k3");
  await page.getByRole("button", { name: "ДАУЫС БЕРУ", exact: true }).click();
  await page
    .getByRole("button", { name: "ДАУЫСТЫ РАСТАУ", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your vote is in!" }),
  ).toBeVisible();
  expect(submitted).toEqual({ code: "A7K3", couple: pair.id });
});
test("projector keeps a 16:9 stage with actual ranking on the left and scannable QR on the right", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Projector geometry is verified at desktop resolutions.",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.route("**/api/screen", (r) =>
    r.fulfill({
      json: {
        visible: true,
        voting_status: "open",
        total_votes: 18,
        leaders: [{ ...pair, votes: 18, percentage: 100, rank: 1 }],
      },
    }),
  );
  await page.goto("/screen/qr");
  await expect(
    page.getByRole("heading", { name: "Айдана & Әлихан" }),
  ).toBeVisible();
  const qr = page.getByAltText(
    "Дауыс беруге арналған QR-код — Шәмші Қайырымдылық Балы 2026",
  );
  await expect(qr).toBeVisible();
  const stage = await page.locator(".projection-stage").boundingBox();
  const image = await qr.boundingBox();
  const leader = await page.locator(".projected-leader").boundingBox();
  expect(stage!.width / stage!.height).toBeCloseTo(16 / 9, 2);
  expect(image!.x).toBeGreaterThan(leader!.x + leader!.width);
  expect(image!.width).toBeGreaterThan(380);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/shamshi-projector.png" });
  await page.setViewportSize({ width: 1366, height: 768 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
});
test("the new event name appears in the invitation and page metadata", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Шәмші Қайырымдылық Балы 2026");
  await expect(page.locator(".hero h1")).toContainText("Қайырымдылық Балы");
  await expect(page.locator(".header .brand")).toContainText(
    "Шәмші Қайырымдылық Балы 2026",
  );
});

test("organizer generates short codes and opens voting from its management panel", async ({
  page,
}) => {
  const settings = { ...defaults, voting_status: "closed" };
  await page.route("**/api/auth/session", (r) =>
    r.fulfill({
      json: { user: { id: pair.id, email: "organizer@example.com" } },
    }),
  );
  await page.route("**/api/admin/data", (r) =>
    r.fulfill({
      json: {
        settings,
        couples: [],
        results: [],
        tickets: [],
        program: [],
        gallery: [],
      },
    }),
  );
  let generated: unknown;
  await page.route("**/api/admin/actions/generate_tickets", (r) => {
    generated = r.request().postDataJSON();
    return r.fulfill({ json: ["A7K3", "B2M9"] });
  });
  await page.route("**/api/admin/actions/set_event_state", (r) => {
    const data = r.request().postDataJSON();
    settings.voting_status = data.p_patch.voting_status;
    return r.fulfill({ json: null });
  });
  await page.goto("/admin");
  await page
    .getByRole("button", { name: "Дауыс беруді басқару", exact: true })
    .click();
  await page.getByLabel("Жасалатын кодтар саны").fill("2");
  await page
    .getByRole("button", { name: "4 ТАҢБАЛЫ КОДТАР ЖАСАУ", exact: true })
    .click();
  await expect(page.locator(".ticket strong")).toHaveText(["A7K3", "B2M9"]);
  expect(generated).toEqual({ p_count: 2 });
  await page
    .getByRole("button", { name: "ДАУЫС БЕРУДІ АШУ", exact: true })
    .click();
  await expect(
    page.getByText("Қазіргі мәртебе: АШЫҚ", { exact: true }),
  ).toBeVisible();
});
