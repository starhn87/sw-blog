import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";
import { expect, it } from "vitest";

it("builds a multi-resolution ICO from the existing SVG without changing its artwork", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sw-blog-favicon-"));
  try {
    await mkdir(join(directory, "src/app"), { recursive: true });
    const source = fileURLToPath(new URL("../app/icon.svg", import.meta.url));
    await copyFile(source, join(directory, "src/app/icon.svg"));
    const script = fileURLToPath(new URL("../../scripts/build-favicon.mjs", import.meta.url));
    await promisify(execFile)(process.execPath, [script], { cwd: directory });
    const ico = await readFile(join(directory, "public/favicon.ico"));
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
    expect(ico.subarray(0, 6)).toEqual(Buffer.from([0, 0, 1, 0, 3, 0]));
    let offset = 54;
    for (const [index, size] of [16, 32, 48].entries()) {
      const entry = 6 + index * 16;
      expect(ico[entry]).toBe(size);
      expect(ico[entry + 1]).toBe(size);
      expect(view.getUint16(entry + 6, true)).toBe(32);
      expect(view.getUint32(entry + 12, true)).toBe(offset);
      const length = view.getUint32(entry + 8, true);
      const png = ico.subarray(offset, offset + length);
      expect(await sharp(png).metadata()).toMatchObject({ format: "png", width: size, height: size, hasAlpha: true });
      expect(png).toEqual(await sharp(source).resize(size, size).png().toBuffer());
      offset += length;
    }
    expect(offset).toBe(ico.length);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
