import { readFile } from "node:fs/promises";

import * as runtime from "./index.mjs";

const operations = Object.freeze({
  init: runtime.prepareInit,
  "accept-init": runtime.acceptInit,
  sync: runtime.syncExternal,
  "sync-owned": runtime.syncOwned,
  unsync: runtime.unsync,
  roast: runtime.prepareRoast,
  "approve-roast": runtime.approveRoast,
  brew: runtime.brew,
  "coffee-chat": runtime.coffeeChat,
  "coffee-blend": runtime.coffeeBlend,
});

async function readInput(stdin) {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  const source = Buffer.concat(chunks).toString("utf8").trim();
  return source === "" ? {} : JSON.parse(source);
}

export async function runCli({
  argv = process.argv.slice(2),
  stdin = process.stdin,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const [command, inputPath] = argv;
  const operation = operations[command];
  if (!operation) {
    stderr.write(
      `${JSON.stringify({ status: "error", error: { code: "unknown_command" } })}\n`,
    );
    return 2;
  }
  try {
    const input = inputPath
      ? JSON.parse(await readFile(inputPath, "utf8"))
      : await readInput(stdin);
    const result = await operation(input);
    stdout.write(`${JSON.stringify({ status: "ok", result })}\n`);
    return 0;
  } catch (error) {
    stderr.write(
      `${JSON.stringify({ status: "error", error: { code: error.code ?? "invalid_input", message: error.message, details: error.details ?? {} } })}\n`,
    );
    return 1;
  }
}
