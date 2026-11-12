import { expect, test } from "@playwright/test";

test("catalog rejects unrecognized URL filters before querying", async ({
  page,
}) => {
  await page.goto("/id/species?unknown=1");
  await expect(
    page.getByRole("heading", { name: "Filter pada alamat tidak valid." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Hapus filter" }),
  ).toHaveAttribute("href", "/id/species");
  await expect(page.locator("main#main")).toHaveCount(1);
});

test("catalog rejects invalid filter values before querying", async ({
  page,
}) => {
  await page.goto("/id/species?status=not-a-conservation-status");
  await expect(
    page.getByRole("heading", { name: "Filter pada alamat tidak valid." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Hapus filter" }),
  ).toHaveAttribute("href", "/id/species");
});

test("catalog filters and sorting stay pending until applied", async ({
  page,
}) => {
  await page.goto("/id/species");
  const originalUrl = page.url();
  const filter = page.getByRole("button", { name: "Filter", exact: true });
  await expect(page.getByRole("combobox", { name: "Urutkan" })).toHaveCount(0);

  await filter.click();
  let drawer = page.getByRole("dialog", { name: "Panel filter" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Semua status" }).click();
  await drawer.getByRole("option", { name: "Kritis (CR)" }).click();
  await drawer
    .getByRole("combobox", { name: "Urutkan" })
    .selectOption("updated");
  expect(page.url()).toBe(originalUrl);

  await drawer.getByRole("button", { name: "Tutup filter" }).click();
  await expect(drawer).not.toBeVisible();
  await filter.click();
  drawer = page.getByRole("dialog", { name: "Panel filter" });
  await expect(
    drawer.getByRole("button", { name: "Semua status" }),
  ).toBeVisible();
  await expect(drawer.getByRole("combobox", { name: "Urutkan" })).toHaveValue(
    "name",
  );

  await drawer.getByRole("button", { name: "Semua status" }).click();
  await drawer.getByRole("option", { name: "Kritis (CR)" }).click();
  await drawer
    .getByRole("combobox", { name: "Urutkan" })
    .selectOption("updated");
  await drawer.getByRole("button", { name: "Terapkan" }).click();
  await expect(page).toHaveURL(/statuses=CR/);
  await expect(page).toHaveURL(/sort=updated/);
});

test("catalog view toggle and filter drawer animate transitions", async ({
  page,
}) => {
  await page.goto("/id/species");

  const toggle = page.locator("[class*='viewToggle']");
  await expect(toggle).toHaveAttribute("data-view", "grid");
  const indicatorX = () =>
    toggle.evaluate((element) => {
      const transform = getComputedStyle(element, "::before").transform;
      return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
    });

  await toggle.getByRole("button", { name: "Daftar", exact: true }).click();
  await expect(toggle).toHaveAttribute("data-view", "list");
  await expect.poll(indicatorX).toBeGreaterThan(0);
  expect(
    Number.parseFloat(
      await toggle.evaluate(
        (element) => getComputedStyle(element, "::before").transitionDuration,
      ),
    ),
  ).toBeGreaterThan(0);

  await toggle.getByRole("button", { name: "Kisi", exact: true }).click();
  await expect(toggle).toHaveAttribute("data-view", "grid");
  await expect.poll(indicatorX).toBe(0);

  const filterButton = page.getByRole("button", {
    name: "Filter",
    exact: true,
  });
  const layer = page.locator("[class*='drawerLayer']");
  await filterButton.click();

  const drawer = page.getByRole("dialog", { name: "Panel filter" });
  await expect(drawer).toBeVisible();
  await expect(layer).toHaveAttribute("data-open", "true");
  const durations = await layer.evaluate((element) => {
    const scrim = element.querySelector("button");
    const panel = element.querySelector("aside");
    if (!scrim || !panel) throw new Error("Filter drawer layers missing");
    return {
      scrim: Number.parseFloat(getComputedStyle(scrim).transitionDuration),
      panel: Number.parseFloat(getComputedStyle(panel).transitionDuration),
    };
  });
  expect(durations.scrim).toBeGreaterThan(0);
  expect(durations.panel).toBeGreaterThan(0);
  await expect
    .poll(() =>
      layer.evaluate(
        (element) => getComputedStyle(element.querySelector("button")!).opacity,
      ),
    )
    .toBe("1");

  await drawer.getByRole("button", { name: "Tutup filter" }).click();
  await expect(layer).toHaveAttribute("data-open", "false");
  await expect(filterButton).toBeFocused();
  await expect(drawer).not.toBeVisible();
});

test("catalog multiselect supports search and keyboard selection", async ({
  page,
}) => {
  await page.goto("/id/species");
  await page.getByRole("button", { name: "Filter", exact: true }).click();

  const drawer = page.getByRole("dialog", { name: "Panel filter" });
  const status = drawer.getByRole("button", {
    name: /Status.*Semua status/,
  });
  await status.focus();
  await page.keyboard.press("ArrowDown");

  const search = drawer.getByRole("searchbox");
  await expect(search).toBeFocused();
  await search.fill("Kritis");

  const critical = drawer.getByRole("option", { name: "Kritis (CR)" });
  await search.press("ArrowDown");
  await expect(critical).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(critical).toHaveAttribute("aria-selected", "true");

  await search.fill("tidak-ada-hasil");
  await expect(drawer.getByRole("status")).toHaveText("Tidak ada opsi");
});

test("catalog list is horizontal and pagination stays centered", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/id/species");
  await page.getByRole("button", { name: "Daftar", exact: true }).click();
  await expect(page).toHaveURL(/view=list/);

  const card = page.locator("main#main a[class*='card']").first();
  const media = card.locator("figure[class*='cardMedia']");
  const content = card.locator("div[class*='cardContent']");
  await expect(card).toBeVisible();
  const desktopLayout = await Promise.all([
    media.boundingBox(),
    content.boundingBox(),
  ]);
  expect(desktopLayout[0]!.x + desktopLayout[0]!.width).toBeLessThanOrEqual(
    desktopLayout[1]!.x + 1,
  );

  const pager = page.locator("main#main [class*='pagination'] nav");
  await expect(pager).toBeVisible();
  const desktopCenter = await pager.evaluate((element) => {
    const first = element.firstElementChild?.getBoundingClientRect();
    const last = element.lastElementChild?.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    if (!first || !last) return Number.NaN;
    return Math.abs(
      (first.left + last.right) / 2 - (bounds.left + bounds.width / 2),
    );
  });
  expect(desktopCenter).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await Promise.all([
    media.boundingBox(),
    content.boundingBox(),
  ]);
  expect(mobileLayout[0]!.x + mobileLayout[0]!.width).toBeLessThanOrEqual(
    mobileLayout[1]!.x + 1,
  );
  const mobileCenter = await pager.evaluate((element) => {
    const first = element.firstElementChild?.getBoundingClientRect();
    const last = element.lastElementChild?.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    if (!first || !last) return Number.NaN;
    return Math.abs(
      (first.left + last.right) / 2 - (bounds.left + bounds.width / 2),
    );
  });
  expect(mobileCenter).toBeLessThanOrEqual(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

test("malformed species slug returns localized not-found response", async ({
  page,
}) => {
  const response = await page.goto("/id/species/not-a-valid-slug!");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Spesies tidak ditemukan." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Kembali ke ensiklopedia" }),
  ).toHaveAttribute("href", "/id/species");
  await expect(page.locator("main#main")).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});
