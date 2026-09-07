import { describe, it, expect } from "vitest";
import { fileToAvatarDataUrl } from "./avatar";

describe("fileToAvatarDataUrl", () => {
  it("rejects a HEIC photo with guidance rather than a generic failure", async () => {
    const file = new File(["x"], "IMG_0001.HEIC", { type: "image/heic" });
    await expect(fileToAvatarDataUrl(file)).rejects.toThrow(/HEIC/i);
  });

  it("rejects a HEIC by extension even when the browser reports no type", async () => {
    const file = new File(["x"], "photo.heif", { type: "" });
    await expect(fileToAvatarDataUrl(file)).rejects.toThrow(/HEIC/i);
  });

  it("rejects a non-image file and names the accepted formats", async () => {
    const file = new File(["x"], "notes.pdf", { type: "application/pdf" });
    await expect(fileToAvatarDataUrl(file)).rejects.toThrow(/PNG, JPEG/i);
  });
});
