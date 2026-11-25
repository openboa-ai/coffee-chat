import { z } from "zod";

export type CoffeeChatErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DIGEST_MISMATCH"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "REDACTION_REQUIRED"
  | "LAST_LOGIN_METHOD"
  | "RELATION_CONFLICT"
  | "ACCOUNT_ALREADY_LINKED";

export class CoffeeChatError extends Error {
  readonly code: CoffeeChatErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CoffeeChatErrorCode,
    status: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CoffeeChatError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const visibilitySchema = z.enum(["private", "public"]);
export type Visibility = z.infer<typeof visibilitySchema>;

export const originKindSchema = z.enum(["source_excerpt", "work_episode"]);
export type OriginKind = z.infer<typeof originKindSchema>;

export const relationKindSchema = z.enum([
  "supersedes",
  "refines",
  "tensions_with",
]);
export type RelationKind = z.infer<typeof relationKindSchema>;

export const attestationKindSchema = z.enum(["agent_attested", "ui_attested"]);
export type AttestationKind = z.infer<typeof attestationKindSchema>;

export const originInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("source_excerpt"),
    url: z.string().min(1).max(2048),
    sourceTitle: z.string().trim().min(1).max(300).nullable().optional(),
    quotation: z.string().trim().min(1).max(2000).nullable().optional(),
    locator: z.string().trim().min(1).max(300).nullable().optional(),
  }),
  z.object({
    kind: z.literal("work_episode"),
    episodeSummary: z.string().trim().min(1).max(2000),
    locator: z.string().trim().min(1).max(300).nullable().optional(),
  }),
]);
export type OriginInput = z.infer<typeof originInputSchema>;

export interface NormalizedOrigin {
  originId: string | null;
  kind: OriginKind;
  url: string | null;
  sourceTitle: string | null;
  quotation: string | null;
  locator: string | null;
  episodeSummary: string | null;
}

export const relationInputSchema = z.object({
  toBeanId: z.string().uuid(),
  kind: relationKindSchema,
  note: z.string().trim().min(1).max(500).nullable().optional(),
});
export type RelationInput = z.infer<typeof relationInputSchema>;

export interface CanonicalRelation {
  toBeanId: string;
  kind: RelationKind;
  note: string | null;
}

export const prepareBeanInputSchema = z.object({
  beanId: z.string().uuid().nullable().optional(),
  expectedVersion: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(180),
  take: z.string().trim().min(1).max(4000),
  tradeoff: z.string().trim().min(1).max(2000),
  boundary: z.string().trim().min(1).max(2000),
  uncertainty: z.string().trim().min(1).max(1000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(48)).max(12).optional(),
  visibility: visibilitySchema.optional(),
  origins: z.array(originInputSchema).min(1).max(8),
  relations: z.array(relationInputSchema).max(12).optional(),
});
export type PrepareBeanInput = z.infer<typeof prepareBeanInputSchema>;

export type CanonicalOrigin =
  | {
      kind: "source_excerpt";
      url: string;
      sourceTitle: string | null;
      quotation: string | null;
      locator: string | null;
      episodeSummary: null;
    }
  | {
      kind: "work_episode";
      url: null;
      sourceTitle: null;
      quotation: null;
      locator: string | null;
      episodeSummary: string;
    };

export interface CanonicalBeanPayload {
  schema: "coffee-chat-bean-v1";
  ownerId: string;
  beanId: string | null;
  expectedVersion: number | null;
  title: string;
  take: string;
  tradeoff: string;
  boundary: string;
  uncertainty: string | null;
  tags: string[];
  visibility: Visibility;
  origins: CanonicalOrigin[];
  relations: CanonicalRelation[];
}

export interface PreparedBeanResult {
  canonicalPayload: CanonicalBeanPayload;
  digest: string;
  operationKey: string;
  requiresRedactionConfirmation: boolean;
}

export const saveBeanInputSchema = prepareBeanInputSchema.extend({
  digest: z.string().regex(/^[0-9a-f]{64}$/),
  operationKey: z.string().min(1).max(128),
  attestationKind: attestationKindSchema.optional(),
  redactionConfirmed: z.boolean().optional(),
});
export type SaveBeanInput = z.infer<typeof saveBeanInputSchema>;

export const setVisibilityInputSchema = z.object({
  beanId: z.string().uuid(),
  visibility: visibilitySchema,
  expectedVersion: z.number().int().positive(),
  operationKey: z.string().min(1).max(128),
  redactionConfirmed: z.boolean().optional(),
});
export type SetVisibilityInput = z.infer<typeof setVisibilityInputSchema>;

export const deleteBeanInputSchema = z.object({
  beanId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  operationKey: z.string().min(1).max(128),
});
export type DeleteBeanInput = z.infer<typeof deleteBeanInputSchema>;

export interface BeanRelationView {
  id: string;
  direction: "outgoing" | "incoming";
  kind: RelationKind;
  relatedBeanId: string;
  relatedBeanTitle: string;
  note: string | null;
}

export interface BeanSummary {
  id: string;
  ownerId: string;
  ownerHandle: string;
  ownerDisplayName: string;
  visibility: Visibility;
  version: number;
  revisionNumber: number;
  title: string;
  tradeoffPreview: string;
  tags: string[];
  originKinds: OriginKind[];
  supersededByBeanId: string | null;
  hasTension: boolean;
  updatedAt: string;
}

export interface BeanDetail extends BeanSummary {
  take: string;
  tradeoff: string;
  boundary: string;
  uncertainty: string | null;
  origins: NormalizedOrigin[];
  relations: BeanRelationView[];
  payloadDigest: string;
  attestationKind: AttestationKind;
  createdAt: string;
  revisions?: Array<{
    revisionNumber: number;
    title: string;
    take: string;
    tradeoff: string;
    boundary: string;
    payloadDigest: string;
    attestationKind?: AttestationKind;
    createdAt: string;
  }>;
}

export type BeanLifecycleState = "active" | "in_tension" | "superseded";

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export interface HydratedShelfRef {
  targetType: "person" | "bean";
  targetId: string;
  shelfItemId: string;
}

export interface PublicSourceSummary {
  originId: string;
  normalizedUrl: string;
  sourceTitle: string | null;
  publicBeanCount: number;
  authorHandles: string[];
  tags: string[];
}

export interface PublicQueryOptions {
  query?: string;
  tag?: string;
  offset?: number;
  limit?: number;
}

export interface PersonalInsightsView {
  totalCount: number;
  publicCount: number;
  privateCount: number;
  originMix: {
    readingCount: number;
    workCount: number;
    uniqueSourceUrlCount: number;
  };
  captureMix: {
    agentAttestedCount: number;
    uiAttestedCount: number;
  };
  lifecycle: {
    activeCount: number;
    inTensionCount: number;
    supersededCount: number;
  };
  revisionCount: number;
  relationCounts: {
    supersedes: number;
    refines: number;
    tensionsWith: number;
  };
  topTags: Array<{ tag: string; count: number }>;
  monthlyActivity: Array<{ month: string; count: number }>;
  activeGrantCount: number;
  shelfCount: number;
  asOf: string;
}

export interface PersonProfileView {
  userId: string;
  handle: string;
  displayName: string;
  publicCount: number;
  privateCount: number;
  publicBeans: BeanDetail[];
}

export interface SourceCompareView {
  originId: string;
  normalizedUrl: string;
  publicBeanCount: number;
  beans: BeanDetail[];
}
