import { expect, test } from "@playwright/test";

test("header shows route context and unavailable account utilities", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/id/journal");

  const header = page.getByRole("banner");
  await expect(
    header.getByText("Ruang eksplorasi", { exact: true }),
  ).toBeVisible();
  await expect(header.getByText("Jurnal saya", { exact: true })).toBeVisible();
  await expect(
    header.getByRole("button", {
      name: "Notifikasi belum tersedia",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    header.getByRole("button", { name: "Akun belum tersedia", exact: true }),
  ).toBeDisabled();
});

test("mobile navigation opens as a keyboard-usable modal drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/id/journal");

  const trigger = page.getByRole("button", { name: "Buka menu" });
  const drawer = page.getByRole("dialog", { name: "Navigasi utama" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(drawer).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    drawer.getByRole("link", { name: "Jurnal Eksplorasi" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    drawer.getByRole("link", { name: "Ensiklopedia" }),
  ).toHaveAttribute("href", "/id/species");
  await expect(drawer.getByText("Identifikasi Spesies")).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: "Identifikasi Spesies" }),
  ).toHaveCount(0);
  await expect(drawer.getByText("Belum tersedia")).toBeVisible();
  await expect(
    drawer
      .getByRole("navigation", { name: "Navigasi utama" })
      .locator('[aria-current="page"]'),
  ).toHaveCount(1);

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(
    await drawer.evaluate((dialog) => dialog.contains(document.activeElement)),
  ).toBe(true);

  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("drawer closes on desktop resize and unknown routes have no active destination", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/id/journal");

  const trigger = page.getByRole("button", { name: "Buka menu" });
  await trigger.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await page.goto("/id/phase0-missing");
  await expect(
    page
      .getByRole("navigation", { name: "Navigasi utama" })
      .locator('[aria-current="page"]'),
  ).toHaveCount(0);
});

test("mobile navigation links remain available without JavaScript", async ({
  browser,
  page,
}) => {
  await page.goto("/id/journal");
  const url = page.url();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const noScriptPage = await context.newPage();
  await noScriptPage.goto(url);

  await expect(
    noScriptPage
      .getByRole("navigation", { name: "Navigasi utama" })
      .getByRole("link", { name: "Jurnal Eksplorasi" }),
  ).toBeVisible();
  await context.close();
});

test("breadcrumbs follow workspace hierarchy and catalog detail context", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const header = page.getByRole("banner");

  await page.goto("/id/about");
  await expect(
    header.getByText("Ruang eksplorasi", { exact: true }),
  ).toBeVisible();
  await expect(
    header.getByText("Tentang RIMBA", { exact: true }),
  ).toBeVisible();
  await expect(header.getByText("Jurnal saya", { exact: true })).toHaveCount(0);

  await page.goto("/id/species");
  await expect(
    header.getByText("Ruang eksplorasi", { exact: true }),
  ).toBeVisible();
  await expect(header.getByText("Ensiklopedia", { exact: true })).toBeVisible();

  await page.goto("/id/species/not-a-valid-slug!");
  await expect(header.getByText("Ensiklopedia", { exact: true })).toBeVisible();
  await expect(header.getByText("Detail", { exact: true })).toBeVisible();
  await expect(
    header.getByText("not-a-valid-slug!", { exact: true }),
  ).toHaveCount(0);
});
