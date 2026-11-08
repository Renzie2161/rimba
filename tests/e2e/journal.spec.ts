import { expect, test } from "@playwright/test";

test("journal derives demo cards, metrics, and group filters from database rows", async ({
  page,
}) => {
  await page.goto("/id/journal");

  const main = page.locator("main#main");
  const entries = main.locator('[data-journal-entry="true"]');
  await expect(main).toHaveCount(1);
  await expect(
    main.getByRole("heading", { level: 1, name: "Jurnal Eksplorasi" }),
  ).toBeVisible();
  await expect(
    main.getByText(
      "Jurnal demo · data contoh pengembangan; bukan riwayat pengguna.",
    ),
  ).toBeVisible();
  await expect(entries).toHaveCount(6);

  const floraCount = Number(
    await main.locator('[data-metric="flora"]').textContent(),
  );
  const faunaCount = Number(
    await main.locator('[data-metric="fauna"]').textContent(),
  );
  const reviewCount = Number(
    await main.locator('[data-metric="review"]').textContent(),
  );
  await expect(
    main.locator('[data-journal-entry="true"][data-group="flora"]'),
  ).toHaveCount(floraCount);
  await expect(
    main.locator('[data-journal-entry="true"][data-group="fauna"]'),
  ).toHaveCount(faunaCount);
  await expect(
    main.locator('[data-journal-entry="true"][data-needs-review="true"]'),
  ).toHaveCount(reviewCount);
  await expect(entries.getByRole("link")).toHaveCount(0);
  await expect(
    main.getByRole("button", { name: /identifikasi|pindai/i }),
  ).toHaveCount(0);

  await main
    .getByRole("navigation", { name: "Filter kelompok catatan" })
    .getByRole("link", { name: /^Hewan\b/ })
    .click();
  await expect(page).toHaveURL(/\/id\/journal\?group=fauna$/);
  await expect(
    main.locator('[data-journal-entry="true"][data-group="flora"]'),
  ).toHaveCount(0);
  await expect(entries).toHaveCount(faunaCount);

  await main.getByRole("link", { name: /semua/i }).click();
  await expect(page).toHaveURL(/\/id\/journal$/);
  await expect(entries).toHaveCount(6);
});

test("journal controls compose in the URL and clear filtered results", async ({
  page,
}) => {
  await page.goto("/id/journal");

  const main = page.locator("main#main");
  const entries = main.locator('[data-journal-entry="true"]');
  const sortMenu = main.locator("details");
  const firstEntry = entries.first();
  const commonName = await firstEntry.locator("h3").innerText();
  const scientificName = await firstEntry.locator("em").innerText();
  const group = await firstEntry.getAttribute("data-group");
  const groupLabel = group === "flora" ? /Tanaman/ : /Hewan/;
  const initialDates = await Promise.all(
    (await entries.locator("time").all()).map(async (time) =>
      Date.parse((await time.getAttribute("datetime")) ?? ""),
    ),
  );
  const initialNames = await entries.locator("h3").allTextContents();

  await main.locator("details > summary").click();
  await main.getByRole("link", { name: "Terlama" }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("sort"))
    .toBe("oldest");
  await expect
    .poll(async () =>
      Promise.all(
        (await entries.locator("time").all()).map(async (time) =>
          Date.parse((await time.getAttribute("datetime")) ?? ""),
        ),
      ),
    )
    .toEqual([...initialDates].sort((a, b) => a - b));
  await expect(sortMenu).toHaveJSProperty("open", true);
  await expect(sortMenu.getByRole("link", { name: "Terlama" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await main.getByRole("link", { name: /Nama A/ }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("sort"))
    .toBe("name");
  const collator = new Intl.Collator("id", { sensitivity: "base" });
  await expect
    .poll(() => entries.locator("h3").allTextContents())
    .toEqual([...initialNames].sort(collator.compare));

  await main.getByRole("link", { name: "Tampilan daftar" }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("view"))
    .toBe("list");
  await main
    .getByRole("navigation", { name: /Filter kelompok/ })
    .getByRole("link", { name: groupLabel })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("group"))
    .toBe(group);
  const groupedUrl = new URL(page.url());
  expect(groupedUrl.searchParams.get("sort")).toBe("name");
  expect(groupedUrl.searchParams.get("view")).toBe("list");

  const search = main.getByRole("searchbox", {
    name: "Cari nama umum atau nama ilmiah",
  });
  const expectSearchMatches = async (query: string) => {
    const normalizedQuery = query.normalize("NFC").toLocaleLowerCase("id");
    await expect
      .poll(async () => {
        const matches = await Promise.all(
          (await entries.all()).map(async (entry) => {
            const [common, scientific] = await Promise.all([
              entry.locator("h3").innerText(),
              entry.locator("em").innerText(),
            ]);
            return [common, scientific].some((name) =>
              name
                .normalize("NFC")
                .toLocaleLowerCase("id")
                .includes(normalizedQuery),
            );
          }),
        );
        return matches.length > 0 && matches.every(Boolean);
      })
      .toBe(true);
  };
  await search.fill(commonName);
  await search.press("Enter");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe(commonName);
  expect(new URL(page.url()).searchParams.get("group")).toBe(group);
  expect(new URL(page.url()).searchParams.get("sort")).toBe("name");
  expect(new URL(page.url()).searchParams.get("view")).toBe("list");
  await expectSearchMatches(commonName);
  await search.fill(scientificName);
  await search.press("Enter");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe(scientificName);
  await expectSearchMatches(scientificName);

  await page.reload();
  await expect(search).toHaveValue(scientificName);
  await page.goBack();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("q") === commonName,
  );
  await expect(search).toHaveValue(commonName);
  await page.goForward();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("q") === scientificName,
  );
  await expect(search).toHaveValue(scientificName);

  await search.fill("rimba-query-no-match-7f3a");
  await search.press("Enter");
  await expect(main.getByRole("status")).toContainText(
    "Tidak ada catatan yang cocok.",
  );
  await main.getByRole("link", { name: "Hapus pencarian dan filter" }).click();
  await expect(page).toHaveURL(
    (url) => !url.searchParams.has("q") && !url.searchParams.has("group"),
  );
  const clearedUrl = new URL(page.url());
  expect(clearedUrl.searchParams.has("q")).toBe(false);
  expect(clearedUrl.searchParams.has("group")).toBe(false);
  expect(clearedUrl.searchParams.get("sort")).toBe("name");
  expect(clearedUrl.searchParams.get("view")).toBe("list");

  await page.goto(`/id/journal?q=${"x".repeat(101)}`);
  await expect(main.getByRole("alert")).toContainText(
    "Parameter jurnal tidak valid atau melebihi batas.",
  );
});
