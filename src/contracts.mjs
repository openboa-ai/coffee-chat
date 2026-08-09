import { normalizeRepository } from "./canonical.mjs";
import { fail } from "./errors.mjs";

export const LICENSE = Object.freeze({
  spdx: "CC-BY-4.0",
  label: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
});

export const NOTICE_KEYS = Object.freeze([
  "publicBeans",
  "sharingCommercialAiAdaptations",
  "attributionLicenseChangesNoEndorsement",
  "irrevocable",
  "rightsAuthority",
  "originExcluded",
  "aiCoffeeNonAuthorshipNonEndorsement",
]);

export function validateOwner(owner) {
  if (!owner || typeof owner.name !== "string" || owner.name.trim() === "") {
    fail("invalid_owner_attribution", "A non-empty owner name is required.");
  }
  if (
    !owner.url ||
    !URL.canParse(owner.url) ||
    new URL(owner.url).protocol !== "https:"
  ) {
    fail("invalid_owner_attribution", "An HTTPS owner URL is required.");
  }
  return { name: owner.name.trim(), url: owner.url };
}

export function validateDeclaration(declaration, repository, trustedContract) {
  if (!declaration || typeof declaration !== "object") {
    fail("invalid_content_license", "The Roastery declaration is missing.");
  }
  const normalized = normalizeRepository(repository);
  if (normalizeRepository(declaration.repository) !== normalized) {
    fail(
      "invalid_content_license",
      "The declaration repository does not match the snapshot.",
    );
  }
  if (
    declaration.contract?.repository !== trustedContract.repository ||
    declaration.contract?.commit !== trustedContract.commit ||
    declaration.contract?.digest !== trustedContract.bundleDigest
  ) {
    fail(
      "invalid_contract_pin",
      "The Roastery declaration does not match the package's one trusted contract pin.",
    );
  }
  if (declaration.contentLicense?.spdx !== LICENSE.spdx) {
    fail(
      "unsupported_content_license",
      "Only the fixed CC BY 4.0 Bean license is supported.",
    );
  }
  if (declaration.contentLicense?.url !== LICENSE.url) {
    fail("invalid_content_license", "The official CC BY 4.0 link is required.");
  }
  if (NOTICE_KEYS.some((key) => declaration.notices?.[key] !== true)) {
    fail(
      "invalid_content_license",
      "Every fixed declaration notice must be accepted.",
    );
  }
  return {
    ...declaration,
    owner: validateOwner(declaration.owner),
    repository: normalized,
  };
}

export function validateCommit(commit) {
  if (!/^[0-9a-f]{40}$/u.test(commit)) {
    fail(
      "invalid_snapshot",
      "A full lowercase 40-character Git commit is required.",
    );
  }
  return commit;
}

export function validateBeans(beans, owner) {
  if (!Array.isArray(beans))
    fail("invalid_snapshot", "Beans must be an array.");
  return beans.map((bean) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        bean.uuid,
      )
    ) {
      fail("invalid_bean", "Every Bean requires a UUIDv7 identifier.");
    }
    if (!bean.content?.trim()) {
      fail("invalid_bean", "Every Bean requires non-empty content.");
    }
    const beanOwner = validateOwner(bean.owner ?? owner);
    if (beanOwner.name !== owner.name || beanOwner.url !== owner.url) {
      fail(
        "invalid_owner_attribution",
        "Bean owner identity must match its Roastery declaration.",
      );
    }
    const valid = {
      uuid: bean.uuid.toLowerCase(),
      content: bean.content,
      owner: beanOwner,
    };
    if (bean.title?.trim()) valid.title = bean.title.trim();
    return valid;
  });
}
