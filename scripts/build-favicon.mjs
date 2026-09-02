import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile("src/app/icon.svg");
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => sharp(source).resize(size, size).png().toBuffer()));
const directory = Buffer.alloc(6 + 16 * images.length);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(images.length, 4);
let offset = directory.length;
for (const [index, image] of images.entries()) {
  const entry = 6 + 16 * index;
  directory[entry] = sizes[index];
  directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(image.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += image.length;
}
await mkdir("public", { recursive: true });
await writeFile("public/favicon.ico", Buffer.concat([directory, ...images]));
console.log(`Favicon built from icon.svg: ${sizes.join(", ")} px`);
