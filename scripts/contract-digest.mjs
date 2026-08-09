import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export async function contractDigest(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile())
        files.push({
          path: relative(root, path).split(sep).join("/"),
          bytes: await readFile(path),
        });
      else throw new Error(`Unsupported contract entry: ${path}`);
    }
  }
  await visit(root);
  files.sort((left, right) =>
    Buffer.from(left.path).compare(Buffer.from(right.path)),
  );
  const hash = createHash("sha256");
  const count = Buffer.alloc(4);
  count.writeUInt32BE(files.length);
  hash.update(count);
  for (const file of files) {
    const path = Buffer.from(file.path, "utf8");
    const pathLength = Buffer.alloc(4);
    pathLength.writeUInt32BE(path.length);
    const contentLength = Buffer.alloc(8);
    contentLength.writeBigUInt64BE(BigInt(file.bytes.length));
    hash
      .update(pathLength)
      .update(path)
      .update(contentLength)
      .update(file.bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}
