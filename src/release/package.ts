export interface PackageInventoryEntry {
  path: string;
  bytes: number;
  sha256: string;
}

export interface PackageReceipt {
  format: "coffee-chat-package-receipt-1";
  buildRevision: string;
  revisionState: "local_worktree" | "release_commit";
  packageDigest: string;
  files: PackageInventoryEntry[];
}
