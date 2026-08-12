import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const managedPython = join(root, ".readme-image-venv", "bin", "python");
const candidates = [
  process.env.PYTHON,
  existsSync(managedPython) ? managedPython : undefined,
  "python3",
].filter((candidate) => typeof candidate === "string");

for (const python of candidates) {
  const selectedPython =
    python.includes("/") && !isAbsolute(python) ? resolve(python) : python;
  const probe = spawnSync(
    selectedPython,
    ["-c", 'import PIL; assert PIL.__version__ == "12.3.0"'],
    { encoding: "utf8" },
  );
  if (probe.status !== 0) continue;

  const result = spawnSync(
    process.execPath,
    [join(root, "scripts", "verify-readme-assets.mjs")],
    {
      env: {
        ...process.env,
        PATH: `${dirname(selectedPython)}${delimiter}${process.env.PATH ?? ""}`,
        PYTHON: selectedPython,
      },
      stdio: "inherit",
    },
  );
  process.exitCode = result.status ?? 1;
  process.exit();
}

assert.fail(
  "Pillow 12.3.0 is required. Follow docs/assets/readme/README.md to create .readme-image-venv.",
);
