import { expect, test } from "@playwright/test";

test("field guide opens as a dialog from the sidebar", async ({ page }) => {
  await page.goto("/id/journal");

  const trigger = page.getByRole("button", { name: "Panduan Lapangan" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", {
      name: "Penasaran boleh. Mengganggu jangan.",
    }),
  ).toBeVisible();
  await expect(dialog.getByRole("listitem")).toHaveCount(3);

  // The guide is no longer a route of its own.
  await expect(page).toHaveURL(/\/id\/journal$/);

  // Closing uses the primary action, not a dismiss X.
  const primary = dialog.getByRole("button", { name: "Siap menjelajah" });
  await expect(primary).toBeVisible();
  await primary.click();
  await expect(dialog).toBeHidden();
});

test("about page uses exact source copy and preserved banner line break", async ({
  page,
}) => {
  await page.goto("/id/about");

  const main = page.locator("main#main");
  await expect(main).toHaveCount(1);
  await expect(
    main.getByRole("heading", { level: 1, name: "Tentang RIMBA" }),
  ).toBeVisible();
  await expect(
    main.getByText(
      "RIMBA merupakan platform ensiklopedia digital yang dikembangkan sebagai ruang informasi dan edukasi mengenai keanekaragaman hayati Indonesia. Nama RIMBA terinspirasi dari kekayaan alam Indonesia yang memiliki beragam ekosistem dan menjadi habitat bagi berbagai jenis satwa. Melalui platform ini, RIMBA hadir untuk memperkenalkan kekayaan fauna Indonesia dengan cara yang lebih modern, informatif, dan mudah diakses oleh masyarakat.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    main.getByText(
      "RIMBA dirancang untuk menjadi media yang menghubungkan masyarakat dengan informasi mengenai berbagai spesies fauna Indonesia. Informasi tersebut mencakup nama spesies, karakteristik, habitat alami, persebaran geografis, hingga status konservasi. Seluruh informasi disajikan secara terstruktur agar pengunjung dapat memperoleh pengetahuan dengan lebih mudah serta memahami keunikan setiap spesies yang ada di Indonesia.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(main.getByText(/belum tersedia dalam prototipe/)).toHaveCount(0);
  const bannerHeading = main.getByRole("heading", { level: 2 });
  await expect(bannerHeading).toHaveText(
    "Mengenal tentang kami,\nmengenal tentang alam",
  );
  await expect(bannerHeading).toHaveCSS("white-space", "pre-line");
});

test("donation demonstration is static and visibly non-payable", async ({
  page,
}) => {
  await page.goto("/id/donate");

  const main = page.locator("main#main");
  await expect(main).toHaveCount(1);
  await expect(
    main.getByRole("heading", { level: 1, name: "Donasi" }),
  ).toBeVisible();
  await expect(
    main.getByText("SIMULASI — JANGAN TRANSFER").first(),
  ).toBeVisible();
  await expect(main.getByText("Tidak ada kode pembayaran")).toBeVisible();
  await expect(
    main.getByText(/Rimba tidak menerima, memproses, atau menyalurkan dana/),
  ).toBeVisible();
  await expect(main.locator("img, canvas, button, input, form, a")).toHaveCount(
    0,
  );
  await expect(main.locator('[aria-hidden="true"] svg')).toHaveCount(2);
});
