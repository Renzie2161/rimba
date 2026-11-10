import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

// Uses the real profile component with fixture data, never a fake auth session.
const fixture = path.resolve(".vitest/profile-layout-fixture.html");
for (const width of [320, 390, 768, 1440]) {
  test(`profile layout fits ${width}px with long profile values`, async ({
    page,
  }) => {
    test.skip(
      !existsSync(fixture),
      "Generate the fixture with tests/unit/profile-view.test.ts first.",
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto(pathToFileURL(fixture).href);
    const cta = page.getByRole("link", { name: "Jelajahi ensiklopedia" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/species");
    const box = await cta.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await cta.focus();
    await expect(cta).toBeFocused();
    await page.locator("h1").click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    if (width < 760) {
      const edit = await page
        .getByRole("link", { name: "Edit profil" })
        .boundingBox();
      const name = await page.locator("h1").boundingBox();
      expect(edit!.y).toBeGreaterThan(name!.y + name!.height);
    }
    await page.screenshot({
      path: `test-results/profile-${width}.png`,
      fullPage: true,
    });
  });
}
