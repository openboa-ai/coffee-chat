import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const receipt = JSON.parse(
  await readFile(resolve(root, "build/package-receipt.json"), "utf8"),
);
const lock = JSON.parse(
  await readFile(resolve(root, "package-lock.json"), "utf8"),
);
const metadata = JSON.parse(
  await readFile(resolve(root, "config/plugin-metadata.json"), "utf8"),
);
const npmPurlName = (name) =>
  name.startsWith("@")
    ? `%40${name.slice(1).split("/").map(encodeURIComponent).join("/")}`
    : encodeURIComponent(name);
const dependencies = Object.entries(lock.packages ?? {})
  .filter(([path]) => path.startsWith("node_modules/"))
  .map(([path, value]) => ({
    type: "library",
    name: path.slice("node_modules/".length),
    version: value.version,
    scope: "optional",
    purl: `pkg:npm/${npmPurlName(path.slice("node_modules/".length))}@${value.version}`,
  }))
  .sort((left, right) => left.name.localeCompare(right.name, "en"));
const serialHex = createHash("sha256")
  .update(receipt.packageDigest)
  .digest("hex")
  .slice(0, 32);
const serial = `${serialHex.slice(0, 8)}-${serialHex.slice(8, 12)}-4${serialHex.slice(13, 16)}-8${serialHex.slice(17, 20)}-${serialHex.slice(20)}`;
const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: `urn:uuid:${serial}`,
  version: 1,
  metadata: {
    properties: [
      { name: "coffee-chat:buildRevision", value: receipt.buildRevision },
      { name: "coffee-chat:revisionState", value: receipt.revisionState },
    ],
    component: {
      type: "application",
      name: metadata.name,
      version: metadata.version,
      hashes: [
        {
          alg: "SHA-256",
          content: receipt.packageDigest.slice("sha256:".length),
        },
      ],
      licenses: [{ license: { id: "MIT" } }],
      purl: `pkg:github/openboa-ai/coffee-chat@${metadata.version}`,
    },
  },
  components: dependencies,
};
const target = resolve(root, "build/sbom.cdx.json");
await mkdir(dirname(target), { recursive: true });
await writeFile(target, `${JSON.stringify(sbom, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    status: "generated",
    format: "CycloneDX",
    components: dependencies.length,
    packageDigest: receipt.packageDigest,
  }),
);
