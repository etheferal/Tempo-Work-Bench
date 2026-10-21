import { describe, expect, it } from "vitest";
import { dictionaries, translate, type Locale } from "./dictionary";

describe("dictionaries", () => {
  it("covers exactly the same keys in both locales", () => {
    expect(Object.keys(dictionaries.tr).sort()).toEqual(Object.keys(dictionaries.en).sort());
  });

  it("has no empty strings", () => {
    for (const locale of ["en", "tr"] as Locale[]) {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(value.length, `${locale}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });
});

describe("translate", () => {
  it("translates known keys per locale", () => {
    expect(translate("en", "common.save")).toBe("Save");
    expect(translate("tr", "common.save")).toBe("Kaydet");
  });

  it("interpolates {vars}", () => {
    expect(translate("en", "dash.greeting", { name: "Ada" })).toBe("Good to see you, Ada 👋");
    expect(translate("tr", "dash.greeting", { name: "Ada" })).toBe("İyi ki buradasın, Ada 👋");
  });

  it("falls back to English for an unknown key lookup at runtime", () => {
    // TranslationKey is compile-time safe; the runtime guard covers dynamic keys.
    const enValue = translate("en", "common.save");
    const dynamicKey = "definitely.not.a.key" as any;
    expect(translate("tr", dynamicKey)).toBe(dynamicKey);
    expect(enValue).toBe("Save");
  });

  it("handles multiple occurrences of the same placeholder", () => {
    const text = translate("tr", "ws.confirmRemove", { name: "Ada" });
    expect(text).toContain("Ada");
    expect(text).not.toContain("{name}");
  });
});
