import { expect, test } from "@playwright/test";

test("guide is directly reachable and catalog links use delivered route", async ({
  page,
}) => {
  await page.goto("/id/guide");

  const main = page.locator("main#main");
  await expect(main).toHaveCount(1);
  await expect(
    main.getByRole("heading", {
      level: 1,
      name: "Penasaran boleh. Mengganggu jangan.",
    }),
  ).toBeVisible();
  await expect(main.getByRole("list")).toHaveCount(1);
  await expect(main.getByRole("list").getByRole("listitem")).toHaveCount(3);
  await expect(main.getByRole("listitem").nth(0)).toHaveAttribute(
    "aria-posinset",
    "1",
  );
  await expect(main.getByRole("listitem").nth(1)).toHaveAttribute(
    "aria-posinset",
    "2",
  );
  await expect(main.getByRole("listitem").nth(2)).toHaveAttribute(
    "aria-posinset",
    "3",
  );
  const backLink = main.getByRole("link", { name: "Kembali ke ensiklopedia" });
  await expect(backLink).toHaveAttribute("href", "/id/species");
  await expect(backLink).toHaveCSS("width", "44px");
  await expect(backLink).toHaveCSS("height", "44px");
  await expect(
    main.getByRole("link", { name: "Siap menjelajah" }),
  ).toHaveAttribute("href", "/id/species");
  await backLink.click();
  await expect(page).toHaveURL(/\/id\/species$/);
  await page.goto("/id/guide");
  await main.getByRole("link", { name: "Siap menjelajah" }).click();
  await expect(page).toHaveURL(/\/id\/species$/);
  await expect(page.locator("main#main")).toBeVisible();
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
  await expect(
    main.getByText(
      "Fitur jurnal pribadi, identifikasi kamera, dan pembayaran belum tersedia dalam prototipe.",
      { exact: true },
    ),
  ).toBeVisible();
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
