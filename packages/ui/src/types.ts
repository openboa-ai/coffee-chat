export type UiVisibility = "private" | "public";
export type UiOriginKind = "source_excerpt" | "work_episode";
export type UiRelationKind = "supersedes" | "refines" | "tensions_with";

export interface UiOrigin {
  originId?: string | null;
  kind: UiOriginKind;
  url: string | null;
  sourceTitle: string | null;
  quotation: string | null;
  locator: string | null;
  episodeSummary: string | null;
}

export interface UiRelation {
  id?: string;
  direction?: "outgoing" | "incoming";
  kind: UiRelationKind;
  relatedBeanId?: string;
  relatedBeanTitle?: string;
  toBeanId?: string;
  note: string | null;
}

export interface UiPreparedBeanPayload {
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
  visibility: UiVisibility;
  origins: UiOrigin[];
  relations: Array<{
    toBeanId: string;
    kind: UiRelationKind;
    note: string | null;
  }>;
}

export interface UiPreparedBeanData {
  canonicalPayload: UiPreparedBeanPayload;
  digest: string;
  operationKey: string;
  requiresRedactionConfirmation: boolean;
}

export interface UiBeanSummary {
  id: string;
  ownerHandle: string;
  ownerDisplayName: string;
  visibility: UiVisibility;
  version: number;
  revisionNumber: number;
  title: string;
  tradeoffPreview: string;
  tags: string[];
  originKinds: UiOriginKind[];
  supersededByBeanId: string | null;
  hasTension: boolean;
  updatedAt: string;
}

export interface UiBeanDetail extends UiBeanSummary {
  take: string;
  tradeoff: string;
  boundary: string;
  uncertainty: string | null;
  origins: UiOrigin[];
  relations: UiRelation[];
  payloadDigest: string;
  attestationKind: "agent_attested" | "ui_attested";
  createdAt: string;
}
