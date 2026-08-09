export interface ProjectMetadata {
  name: string;
  displayName: string;
  version: string;
  description: string;
  publisher: { name: string; email: string; url: string };
  homepage: string;
  repository: string;
  license: "MIT";
}

export const CALVER_PATTERN =
  /^\d{4}\.(?:[1-9]|1[0-2])\.(?:[1-9]|[12]\d|3[01])$/u;
