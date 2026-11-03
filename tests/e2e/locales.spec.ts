import { expect, test } from "@playwright/test";

test("root redirects to Indonesian", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/id$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Setiap spesies punya kisah",
  );
});

test("home has no horizontal overflow at target viewports", async ({
  page,
}) => {
  await page.goto("/id");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  for (const width of [360, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const isWithinViewport = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(isWithinViewport, `horizontal overflow at ${width}px`).toBe(true);
  }
});
test("unmatched Indonesian paths show localized 404 and recovery", async ({
  page,
}) => {
  const response = await page.goto("/id/phase0-missing");

  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(
    page.getByRole("heading", { name: "Halaman tidak ditemukan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Kembali ke beranda" }),
  ).toHaveAttribute("href", "/id");
});

test("language menu offers Indonesian only", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/id$/);

  const languageTrigger = page.getByRole("button", { name: "Pilih bahasa" });
  await languageTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(languageTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("link", { name: "Bahasa Indonesia" }),
  ).toHaveAttribute("href", "/id");
  await expect(page.getByRole("link", { name: "English" })).toHaveCount(0);

  const response = await page.goto("/en");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Halaman tidak ditemukan." }),
  ).toBeVisible();
});

test("navbar uses supplied logo and Hanken Grotesk", async ({ page }) => {
  await page.goto("/id");

  const logoLoaded = await page.locator(".wordmark-logo").evaluate((image) => {
    const logo = image as HTMLImageElement;
    return logo.complete && logo.naturalWidth > 0;
  });
  expect(logoLoaded).toBe(true);

  const fontFamily = await page
    .locator("body")
    .evaluate((body) => getComputedStyle(body).fontFamily);
  expect(fontFamily).toContain("Hanken");
});

test("theme toggle switches between accessible light and dark themes", async ({
  page,
}) => {
  await page.goto("/id");

  const darkThemeToggle = page.getByRole("button", {
    name: "Aktifkan tema gelap",
  });
  await darkThemeToggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Aktifkan tema terang" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(24, 36, 46)",
  );

  await page.getByRole("button", { name: "Aktifkan tema terang" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: "Aktifkan tema gelap" }),
  ).toHaveAttribute("aria-pressed", "false");
});
