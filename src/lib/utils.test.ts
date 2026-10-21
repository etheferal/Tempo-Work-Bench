import { describe, expect, it } from "vitest";
import { slugify, initials, dueLabel, parseMeta } from "./utils";

describe("slugify", () => {
  it("creates URL-safe slugs", () => {
    expect(slugify("Acme Inc")).toBe("acme-inc");
    expect(slugify("  Hello   World!  ")).toBe("hello-world");
    expect(slugify("Website Redesign v2.0")).toBe("website-redesign-v20");
  });

  it("transliterates Turkish characters", () => {
    expect(slugify("İş Güç")).toBe("is-guc");
    expect(slugify("Örnek Proje")).toBe("ornek-proje");
  });

  it("caps the length", () => {
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(48);
  });
});

describe("initials", () => {
  it("takes the first letters of the first two words", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Efe")).toBe("E");
    expect(initials("multi word name here")).toBe("MW");
  });
});

describe("dueLabel", () => {
  it("returns null for no due date", () => {
    expect(dueLabel(null)).toBeNull();
  });

  it("marks past dates as overdue", () => {
    const past = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    const label = dueLabel(past);
    expect(label?.tone).toBe("overdue");
  });

  it("detects today", () => {
    const label = dueLabel(new Date().toISOString());
    expect(label?.text).toBe("Today");
    expect(label?.tone).toBe("soon");
  });

  it("detects tomorrow", () => {
    const label = dueLabel(new Date(Date.now() + 24 * 3600 * 1000 + 3600 * 1000).toISOString());
    expect(label?.text).toBe("Tomorrow");
  });
});

describe("parseMeta", () => {
  it("parses JSON payloads", () => {
    expect(parseMeta('{"a":"b"}')).toEqual({ a: "b" });
  });

  it("returns null for invalid JSON or null", () => {
    expect(parseMeta("not json")).toBeNull();
    expect(parseMeta(null)).toBeNull();
  });
});
