import { describe, expect, it } from "vitest";
import {
  buildStoredName,
  formatFileSize,
  isAllowedMime,
  sanitizeFileName,
  MAX_ATTACHMENT_SIZE,
} from "./attachments";

describe("isAllowedMime", () => {
  it("accepts images, documents and archives", () => {
    expect(isAllowedMime("image/png")).toBe(true);
    expect(isAllowedMime("application/pdf")).toBe(true);
    expect(isAllowedMime("application/zip")).toBe(true);
  });

  it("rejects executables, scripts and svg", () => {
    expect(isAllowedMime("application/x-msdownload")).toBe(false);
    expect(isAllowedMime("image/svg+xml")).toBe(false);
    expect(isAllowedMime("text/html")).toBe(false);
  });
});

describe("sanitizeFileName", () => {
  it("keeps normal names", () => {
    expect(sanitizeFileName("requirements.pdf")).toBe("requirements.pdf");
    expect(sanitizeFileName("Logo (2).PNG")).toBe("logo-2.png");
  });

  it("transliterates Turkish characters", () => {
    expect(sanitizeFileName("iş planı.pdf")).toBe("is-plani.pdf");
    expect(sanitizeFileName("Görsel.PNG")).toBe("gorsel.png");
  });

  it("neutralizes path traversal", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Windows\\system32\\x.txt")).toBe("x.txt");
  });

  it("drops weird extensions entirely", () => {
    expect(sanitizeFileName("archive.zip.exe")).toBe("archive-zip");
    expect(sanitizeFileName("script.php")).toBe("script");
  });

  it("returns empty for nothing usable", () => {
    expect(sanitizeFileName("...")).toBe("");
    expect(sanitizeFileName("")).toBe("");
  });

  it("caps the length", () => {
    const long = "a".repeat(200) + ".pdf";
    expect(sanitizeFileName(long).length).toBeLessThanOrEqual(100);
  });
});

describe("formatFileSize", () => {
  it("formats B, KB and MB", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
  });
});

describe("buildStoredName", () => {
  it("produces a safe unique name with the extension", () => {
    const name = buildStoredName(".pdf");
    expect(name).toMatch(/^[a-f0-9]{32}\.pdf$/);
    expect(buildStoredName("bogus")).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("MAX_ATTACHMENT_SIZE", () => {
  it("is 5 MB", () => {
    expect(MAX_ATTACHMENT_SIZE).toBe(5 * 1024 * 1024);
  });
});
