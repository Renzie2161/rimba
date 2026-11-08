import { expect, test } from "@playwright/test";

test("root and localized root redirect to the default journal", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/id\/journal$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(
    page.getByRole("main").getByRole("heading", {
      level: 1,
      name: /^Jurnal Eksplorasi/,
    }),
  ).toBeVisible();

  await page.goto("/id");
  await expect(page).toHaveURL(/\/id\/journal$/);
});

test("journal has no horizontal overflow at target viewports", async ({
  page,
}) => {
  await page.goto("/id/journal");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  for (const width of [360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const isWithinViewport = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(isWithinViewport, `horizontal overflow at ${width}px`).toBe(true);
  }
});

test("unsupported English path stays unavailable", async ({ page }) => {
  const response = await page.goto("/en");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Halaman tidak ditemukan." }),
  ).toBeVisible();
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
    page.getByRole("link", { name: "Kembali ke Jurnal Eksplorasi" }),
  ).toHaveAttribute("href", "/id/journal");
});

test("wordmark returns to journal and uses Plus Jakarta Sans", async ({
  page,
}) => {
  await page.goto("/id/journal");

  const wordmark = page.getByRole("link", { name: "RIMBA", exact: true });
  await expect(wordmark).toHaveAttribute("href", "/id/journal");

  await expect
    .poll(() =>
      page
        .locator(".wordmark-logo")
        .evaluate(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0,
        ),
    )
    .toBe(true);

  const fontFamily = await page
    .locator("body")
    .evaluate((body) => getComputedStyle(body).fontFamily);
  expect(fontFamily.replaceAll("_", " ")).toContain("Plus Jakarta Sans");
});
