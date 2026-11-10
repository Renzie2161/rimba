import { expect, test } from "@playwright/test";

test("login offers Google as the only authentication method", async ({
  page,
}) => {
  await page.goto("/id/login");
  const main = page.locator("main#main");
  await expect(
    main.getByRole("heading", { name: "Selamat datang di Rimba." }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: /Lanjutkan dengan Google/ }),
  ).toBeVisible();
  await expect(
    main.locator('input[type="email"], input[type="password"]'),
  ).toHaveCount(0);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Akun", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Masuk dengan Google →" }),
  ).toBeVisible();
});

test("profile, edit and onboarding routes require a session", async ({
  page,
}) => {
  for (const route of ["/id/profile", "/id/profile/edit", "/id/onboarding"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/id\/login$/);
    await expect(
      page.getByRole("button", { name: /Lanjutkan dengan Google/ }),
    ).toBeVisible();
  }
});

test("callback cannot use a supplied external redirect", async ({ page }) => {
  await page.goto("/auth/callback?next=https://example.com");
  await expect(page).toHaveURL(/\/id\/login\?error=callback$/);
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Login Google belum berhasil",
  );
});

test("login stays usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/id/login");
  const google = page
    .locator("main")
    .getByRole("button", { name: /Lanjutkan dengan Google/ });
  await expect(google).toBeVisible();
  await google.focus();
  await expect(google).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
