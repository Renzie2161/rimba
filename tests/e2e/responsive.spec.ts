import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768]) {
  test(`public pages fit ${width}px screens`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "/id/journal",
      "/id/species",
      "/id/species/maleo",
      "/id/about",
      "/id/donate",
      "/id/identify",
      "/id/login",
    ]) {
      await page.goto(path);
      await expect(page.locator("main#main")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => ({
        width: innerWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(
        overflow.content,
        `${path} overflows at ${width}px`,
      ).toBeLessThanOrEqual(overflow.width);
    }
    const menu = page.getByRole("button", { name: "Buka menu" });
    await menu.click();
    const drawer = page.getByRole("dialog", { name: "Navigasi utama" });
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
  });
}
