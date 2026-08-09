import { execFileSync } from "node:child_process";

function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
  }).trim();
}

export function resolveBuildRevision(root, { release = false } = {}) {
  const head = git(root, ["rev-parse", "HEAD"]);
  if (!/^[0-9a-f]{40}$/u.test(head))
    throw new Error("Build revision must resolve to one full Git commit.");
  const requested = process.env.COFFEE_CHAT_BUILD_REVISION;
  if (requested !== undefined && requested !== head)
    throw new Error(
      "Requested build revision does not equal the checked-out commit.",
    );
  if (release) {
    if (!requested)
      throw new Error("Release builds require COFFEE_CHAT_BUILD_REVISION.");
    const sourceState = git(root, ["status", "--short"]);
    if (sourceState !== "")
      throw new Error(
        "Release builds require committed, byte-identical source.",
      );
  }
  return {
    buildRevision: head,
    revisionState: release ? "release_commit" : "local_worktree",
  };
}
