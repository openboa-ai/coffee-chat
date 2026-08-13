import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join, sep } from "node:path";

export const packageRoots = Object.freeze([
  ".agents",
  ".codex-plugin",
  "config/plugin-metadata.json",
  "contract",
  "docs/assets/readme/coffee-chat-hero.png",
  "docs/assets/readme/coffee-chat-judgment.png",
  "docs/assets/readme/coffee-chat-talk-work.png",
  "docs/product-boundaries.md",
  "docs/quality-map.md",
  "runtime",
  "skills",
  "AGENTS.md",
  "INSTALL_FOR_AGENTS.md",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "plugin.json",
]);

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function collectFiles(root, entries = packageRoots) {
  const found = [];
  async function visit(path) {
    const absolute = join(root, path);
    const information = await lstat(absolute);
    if (information.isSymbolicLink()) {
      throw new Error(`Package symlink is forbidden: ${path}`);
    }
    if (information.isDirectory()) {
      for (const child of (await readdir(absolute)).sort()) {
        await visit(join(path, child));
      }
      return;
    }
    if (!information.isFile()) {
      throw new Error(`Unsupported package entry: ${path}`);
    }
    const normalized = path.split(sep).join("/");
    if (normalized.startsWith("../") || normalized.includes("/../")) {
      throw new Error(`Escaped package path: ${normalized}`);
    }
    found.push({ path: normalized, bytes: await readFile(absolute) });
  }
  for (const entry of entries) await visit(entry);
  return found.sort((left, right) =>
    Buffer.from(left.path).compare(Buffer.from(right.path)),
  );
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function packageZip(files, rootName = "coffee-chat") {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(`${rootName}/${file.path}`, "utf8");
    const checksum = crc32(file.bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x0021, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(file.bytes.length, 18);
    local.writeUInt32LE(file.bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, file.bytes);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x0021, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(file.bytes.length, 20);
    central.writeUInt32LE(file.bytes.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + file.bytes.length;
  }
  const directory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, directory, end]);
}
