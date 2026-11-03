import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["id"],
  defaultLocale: "id",
  localePrefix: "always",
  localeDetection: false,
});
