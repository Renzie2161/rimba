import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import ProfileContent from "../../src/features/account/profile-content";
import styles from "../../src/features/account/profile.module.css";
import type { Profile } from "../../src/features/account/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; href: string }) =>
    createElement("a", props, children),
}));
vi.mock("@/features/account/actions", () => ({ signOut: async () => {} }));

describe("profile view", () => {
  it("uses a consistent encyclopedia button and safely renders long profile data", () => {
    const profile: Profile = {
      id: "10000000-0000-4000-8000-000000000001",
      username: "penjelajah_uji",
      display_name: "Penjelajah Alam Nusantara Dengan Nama Panjang",
      location: "Jakarta, Indonesia",
      bio: "Mengenal alam, melindungi lebih baik. <script>unsafe</script>",
      created_at: "2026-11-10T00:00:00Z",
      updated_at: "2026-11-10T00:00:00Z",
      username_created_at: "2026-11-10T00:00:00Z",
      username_changed_at: "2026-11-10T00:00:00Z",
    };
    const markup = renderToStaticMarkup(
      createElement(ProfileContent, {
        profile,
        email: "penjelajah@example.test",
      }),
    );
    expect(markup).toContain(`class="${styles.exploreButton}" href="/species"`);
    expect(markup).not.toContain("<script>unsafe</script>");
    expect(markup).toContain("&lt;script&gt;unsafe&lt;/script&gt;");
    expect(markup).toContain('href="/profile/edit"');
    const globalCss = readFileSync("src/app/globals.css", "utf8").replace(
      /^@import.*$/gm,
      "",
    );
    const css = readFileSync(
      "src/features/account/profile.module.css",
      "utf8",
    ).replace(/\.([a-zA-Z_][\w-]*)/g, (selector, key: string) =>
      styles[key] ? `.${styles[key]}` : selector,
    );
    mkdirSync(".vitest", { recursive: true });
    writeFileSync(
      path.join(".vitest", "profile-layout-fixture.html"),
      `<!doctype html><html lang="id"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Profile layout fixture</title><style>${globalCss}\n${css}\nbody{font-family:Arial,sans-serif}.preview-workspace{margin-left:236px}@media(max-width:1199px){.preview-workspace{margin-left:0}}</style><div class="preview-workspace">${markup}</div></html>`,
    );
  });
});
