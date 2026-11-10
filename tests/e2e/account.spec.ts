import { expect, test } from "@playwright/test";

test("login offers Google as the only authentication method", async ({
  page,
}) => {
  await page.goto("/id/login");
  const main = page.locator("main#main");
  await expect(
    main.getByRole("heading", { name: "Masuk dan jelajahi lebih jauh." }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Masuk dengan Google", exact: true }),
  ).toBeVisible();
  await expect(
    main.locator('input[type="email"], input[type="password"]'),
  ).toHaveCount(0);
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);

  await page.goto("/id/journal");
  const banner = page.getByRole("banner");
  const signIn = banner.getByRole("link", { name: "Masuk", exact: true });
  await expect(signIn).toBeVisible();
  await expect(
    banner.getByRole("button", { name: "Akun", exact: true }),
  ).toHaveCount(0);
  expect(
    await signIn.evaluate(
      (element) => getComputedStyle(element).textDecorationLine,
    ),
  ).toBe("none");
});

test("Google sign-in button exposes pending state", async ({ page }) => {
  await page.goto("/id/login");
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      await route.abort();
      return;
    }
    await route.continue();
  });

  const google = page.getByRole("button", {
    name: "Masuk dengan Google",
    exact: true,
  });
  await google.click();
  await expect(google).toBeDisabled();
  await expect(google).toContainText("Menghubungkan ke Google…");
});

test("profile, edit and onboarding routes require a session", async ({
  page,
}) => {
  for (const route of ["/id/profile", "/id/profile/edit", "/id/onboarding"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/id\/login$/);
    await expect(
      page.getByRole("button", { name: "Masuk dengan Google", exact: true }),
    ).toBeVisible();
  }
});

test("callback cannot use a supplied external redirect", async ({ page }) => {
  await page.goto("/auth/callback?next=https://example.com");
  await expect(page).toHaveURL(/\/id\/login\?error=callback$/);
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Tidak dapat memulai masuk dengan Google",
  );
});

test("login stays usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/id/login");
  const google = page.getByRole("button", {
    name: "Masuk dengan Google",
    exact: true,
  });
  await expect(google).toBeVisible();
  await google.focus();
  await expect(google).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
