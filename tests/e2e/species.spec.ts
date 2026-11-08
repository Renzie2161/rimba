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
