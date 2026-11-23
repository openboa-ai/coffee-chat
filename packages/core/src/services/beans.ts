import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { CoffeeChatDb } from "../db/client.js";
import {
  beanOrigins,
  beanRelations,
  beanRevisions,
  beans,
  mutationReceipts,
  origins,
  shelfItems,
  users,
} from "../db/schema.js";
import { computeJcsDigest } from "../jcs.js";
import {
  type AttestationKind,
  type BeanDetail,
  type BeanRelationView,
  type BeanSummary,
  type CanonicalBeanPayload,
  type CanonicalRelation,
  CoffeeChatError,
  type DeleteBeanInput,
  deleteBeanInputSchema,
  type NormalizedOrigin,
  type OriginKind,
  type PersonProfileView,
  type PrepareBeanInput,
  prepareBeanInputSchema,
  type PreparedBeanResult,
  type RelationKind,
  type SaveBeanInput,
  saveBeanInputSchema,
  type SetVisibilityInput,
  setVisibilityInputSchema,
  type SourceCompareView,
  type Visibility,
} from "../types.js";
import { normalizeOriginUrl } from "../url.js";

function normalizeTags(tags?: string[]): string[] {
  if (!tags || tags.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const clean = t.trim().toLowerCase();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

function normalizeOriginsInput(
  rawOrigins: PrepareBeanInput["origins"],
): CanonicalBeanPayload["origins"] {
  return rawOrigins.map((origin) => {
    if (origin.kind === "source_excerpt") {
      const { normalizedUrl, fragmentLocator } = normalizeOriginUrl(origin.url);
      return {
        kind: "source_excerpt",
        url: normalizedUrl,
        sourceTitle: origin.sourceTitle?.trim() || null,
        quotation: origin.quotation?.trim() || null,
        locator: origin.locator?.trim() || fragmentLocator || null,
        episodeSummary: null,
      };
    }

    return {
      kind: "work_episode",
      url: null,
      sourceTitle: null,
      quotation: null,
      locator: origin.locator?.trim() || null,
      episodeSummary: origin.episodeSummary.trim(),
    };
  });
}

function normalizeRelationsInput(
  rawRelations?: PrepareBeanInput["relations"],
): CanonicalRelation[] {
  if (!rawRelations || rawRelations.length === 0) return [];
  const seen = new Set<string>();
  const out: CanonicalRelation[] = [];
  for (const rel of rawRelations) {
    const key = `${rel.toBeanId}:${rel.kind}`;
    if (seen.has(key)) {
      throw new CoffeeChatError(
        "RELATION_CONFLICT",
        400,
        `Duplicate relation (${rel.kind} -> ${rel.toBeanId}).`,
      );
    }
    seen.add(key);
    out.push({
      toBeanId: rel.toBeanId,
      kind: rel.kind,
      note: rel.note?.trim() || null,
    });
  }
  return out;
}

function buildSearchDocument(payload: CanonicalBeanPayload): string {
  const originText = payload.origins
    .map((o) =>
      [o.sourceTitle, o.quotation, o.episodeSummary, o.url]
        .filter(Boolean)
        .join(" "),
    )
    .join(" ");
  return [
    payload.title,
    payload.take,
    payload.tradeoff,
    payload.boundary,
    payload.uncertainty ?? "",
    payload.tags.join(" "),
    originText,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildCanonicalPayload(
  ownerId: string,
  parsed: PrepareBeanInput,
): CanonicalBeanPayload {
  const beanId = parsed.beanId ?? null;
  const expectedVersion = parsed.expectedVersion ?? null;

  if (beanId === null && expectedVersion !== null) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "Creating a new Bean must not supply expectedVersion.",
    );
  }
  if (beanId !== null && expectedVersion === null) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "Updating an existing Bean requires expectedVersion.",
    );
  }

  return {
    schema: "coffee-chat-bean-v1",
    ownerId,
    beanId,
    expectedVersion,
    title: parsed.title.trim(),
    take: parsed.take.trim(),
    tradeoff: parsed.tradeoff.trim(),
    boundary: parsed.boundary.trim(),
    uncertainty: parsed.uncertainty?.trim() || null,
    tags: normalizeTags(parsed.tags),
    // Safety-first invariant: default visibility is ALWAYS private.
    visibility: parsed.visibility ?? "private",
    origins: normalizeOriginsInput(parsed.origins),
    relations: normalizeRelationsInput(parsed.relations),
  };
}

async function validateOwnerRelations(
  db: CoffeeChatDb,
  ownerId: string,
  fromBeanId: string | null,
  relations: CanonicalRelation[],
): Promise<void> {
  if (relations.length === 0) return;

  const targetIds = Array.from(new Set(relations.map((r) => r.toBeanId)));
  if (fromBeanId && targetIds.includes(fromBeanId)) {
    throw new CoffeeChatError(
      "RELATION_CONFLICT",
      400,
      "A Bean cannot relate to itself.",
    );
  }

  const targetBeans = await db
    .select({ id: beans.id, ownerId: beans.ownerId })
    .from(beans)
    .where(inArray(beans.id, targetIds));

  if (targetBeans.length !== targetIds.length) {
    throw new CoffeeChatError(
      "NOT_FOUND",
      404,
      "One or more target Beans for relations were not found.",
    );
  }

  for (const tb of targetBeans) {
    if (tb.ownerId !== ownerId) {
      throw new CoffeeChatError(
        "FORBIDDEN",
        403,
        "Relations can only link Beans owned by the same author.",
      );
    }
  }

  // Prevent supersedes cycles when updating an existing Bean.
  const supersedesTargets = relations
    .filter((r) => r.kind === "supersedes")
    .map((r) => r.toBeanId);

  if (fromBeanId && supersedesTargets.length > 0) {
    const ownerSupersedes = await db
      .select({
        fromBeanId: beanRelations.fromBeanId,
        toBeanId: beanRelations.toBeanId,
      })
      .from(beanRelations)
      .where(
        and(
          eq(beanRelations.ownerId, ownerId),
          eq(beanRelations.kind, "supersedes"),
        ),
      );

    const adj = new Map<string, string[]>();
    for (const edge of ownerSupersedes) {
      if (edge.fromBeanId === fromBeanId) continue; // will be replaced
      const arr = adj.get(edge.fromBeanId) ?? [];
      arr.push(edge.toBeanId);
      adj.set(edge.fromBeanId, arr);
    }
    adj.set(fromBeanId, supersedesTargets);

    // DFS from fromBeanId checking reachability back to fromBeanId.
    const visited = new Set<string>();
    const stack = [...supersedesTargets];
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (curr === fromBeanId) {
        throw new CoffeeChatError(
          "RELATION_CONFLICT",
          400,
          "Supersedes relations cannot form a cycle.",
        );
      }
      if (visited.has(curr)) continue;
      visited.add(curr);
      for (const next of adj.get(curr) ?? []) {
        stack.push(next);
      }
    }
  }
}

/**
 * Validates and normalizes a Bean candidate without persisting anything to DB.
 * Returns canonical payload, RFC 8785 JCS SHA-256 digest, and fresh operationKey.
 */
export async function prepareBean(
  db: CoffeeChatDb,
  ownerId: string,
  rawInput: PrepareBeanInput,
): Promise<PreparedBeanResult> {
  const parsed = prepareBeanInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }

  const canonicalPayload = buildCanonicalPayload(ownerId, parsed.data);

  if (canonicalPayload.beanId) {
    const [existing] = await db
      .select({ id: beans.id, ownerId: beans.ownerId, version: beans.version })
      .from(beans)
      .where(eq(beans.id, canonicalPayload.beanId))
      .limit(1);

    if (!existing || existing.ownerId !== ownerId) {
      throw new CoffeeChatError("NOT_FOUND", 404, "Bean not found.");
    }
    if (existing.version !== canonicalPayload.expectedVersion) {
      throw new CoffeeChatError(
        "VERSION_CONFLICT",
        409,
        `Bean version conflict: expected ${canonicalPayload.expectedVersion}, latest is ${existing.version}.`,
        { latestVersion: existing.version },
      );
    }
  }

  await validateOwnerRelations(
    db,
    ownerId,
    canonicalPayload.beanId,
    canonicalPayload.relations,
  );

  const { digest } = computeJcsDigest(canonicalPayload);
  const hasWorkEpisode = canonicalPayload.origins.some(
    (o) => o.kind === "work_episode",
  );

  return {
    canonicalPayload,
    digest,
    operationKey: randomUUID(),
    requiresRedactionConfirmation:
      canonicalPayload.visibility === "public" && hasWorkEpisode,
  };
}

/**
 * Atomically persists an author-confirmed Bean (create or new revision).
 * Enforces digest verification, idempotency receipts, optimistic version lock,
 * and work_episode public redaction confirmation.
 */
export async function saveBean(
  db: CoffeeChatDb,
  ownerId: string,
  rawInput: SaveBeanInput,
): Promise<{
  bean: BeanDetail;
  replayed: boolean;
}> {
  const parsed = saveBeanInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }

  const input = parsed.data;
  const canonicalPayload = buildCanonicalPayload(ownerId, input);
  const { digest: computedDigest } = computeJcsDigest(canonicalPayload);

  // Check idempotency receipt first (even before digest/version so retries stay idempotent).
  const [existingReceipt] = await db
    .select()
    .from(mutationReceipts)
    .where(
      and(
        eq(mutationReceipts.ownerId, ownerId),
        eq(mutationReceipts.operationKey, input.operationKey),
      ),
    )
    .limit(1);

  if (existingReceipt) {
    if (
      existingReceipt.action !== "save_bean" ||
      existingReceipt.requestDigest !== computedDigest
    ) {
      throw new CoffeeChatError(
        "IDEMPOTENCY_CONFLICT",
        409,
        "operationKey was already used with a different payload.",
      );
    }
    const storedBeanId = existingReceipt.resultJson.beanId as string;
    // Check if the Bean was subsequently deleted; NEVER resurrect a deleted Bean!
    const [stillExists] = await db
      .select({ id: beans.id })
      .from(beans)
      .where(eq(beans.id, storedBeanId))
      .limit(1);

    if (!stillExists) {
      throw new CoffeeChatError(
        "NOT_FOUND",
        404,
        "This operation previously created or updated a Bean that has since been deleted and cannot be resurrected.",
      );
    }

    const detail = await getBean(db, ownerId, storedBeanId);
    return { bean: detail, replayed: true };
  }

  if (input.digest !== computedDigest) {
    throw new CoffeeChatError(
      "DIGEST_MISMATCH",
      400,
      "Submitted digest does not match the canonical payload. Re-run prepare_bean and confirm again.",
    );
  }

  const hasWorkEpisode = canonicalPayload.origins.some(
    (o) => o.kind === "work_episode",
  );
  if (
    canonicalPayload.visibility === "public" &&
    hasWorkEpisode &&
    !input.redactionConfirmed
  ) {
    throw new CoffeeChatError(
      "REDACTION_REQUIRED",
      400,
      "Publishing a work_episode Bean requires explicit redactionConfirmed=true after checking for proprietary or private context.",
    );
  }

  await validateOwnerRelations(
    db,
    ownerId,
    canonicalPayload.beanId,
    canonicalPayload.relations,
  );

  const attestationKind: AttestationKind =
    input.attestationKind ?? "agent_attested";
  const searchDocument = buildSearchDocument(canonicalPayload);

  const savedBeanId = await db.transaction(async (tx) => {
    const resolvedOrigins: NormalizedOrigin[] = [];
    for (const o of canonicalPayload.origins) {
      if (o.kind === "source_excerpt" && o.url) {
        const [existingOrigin] = await tx
          .select()
          .from(origins)
          .where(eq(origins.normalizedUrl, o.url))
          .limit(1);

        const originId =
          existingOrigin?.id ??
          (
            await tx
              .insert(origins)
              .values({
                id: randomUUID(),
                kind: "source_excerpt",
                normalizedUrl: o.url,
              })
              .returning({ id: origins.id })
          )[0]!.id;

        resolvedOrigins.push({
          originId,
          kind: "source_excerpt",
          url: o.url,
          sourceTitle: o.sourceTitle,
          quotation: o.quotation,
          locator: o.locator,
          episodeSummary: null,
        });
      } else {
        const [insertedOrigin] = await tx
          .insert(origins)
          .values({
            id: randomUUID(),
            kind: "work_episode",
            normalizedUrl: null,
          })
          .returning({ id: origins.id });

        resolvedOrigins.push({
          originId: insertedOrigin!.id,
          kind: "work_episode",
          url: null,
          sourceTitle: null,
          quotation: null,
          locator: o.locator,
          episodeSummary: o.episodeSummary,
        });
      }
    }

    let beanId: string;
    let nextVersion: number;
    let nextRevisionNumber: number;

    if (canonicalPayload.beanId === null) {
      beanId = randomUUID();
      nextVersion = 1;
      nextRevisionNumber = 1;

      const revisionId = randomUUID();
      await tx.insert(beans).values({
        id: beanId,
        ownerId,
        visibility: canonicalPayload.visibility,
        currentRevisionId: revisionId,
        version: nextVersion,
      });

      await tx.insert(beanRevisions).values({
        id: revisionId,
        beanId,
        revisionNumber: nextRevisionNumber,
        title: canonicalPayload.title,
        take: canonicalPayload.take,
        tradeoff: canonicalPayload.tradeoff,
        boundary: canonicalPayload.boundary,
        uncertainty: canonicalPayload.uncertainty,
        tags: canonicalPayload.tags,
        originsJson: resolvedOrigins,
        searchDocument,
        payloadDigest: computedDigest,
        attestationKind,
      });
    } else {
      beanId = canonicalPayload.beanId;
      const [existing] = await tx
        .select()
        .from(beans)
        .where(eq(beans.id, beanId))
        .limit(1);

      if (!existing || existing.ownerId !== ownerId) {
        throw new CoffeeChatError("NOT_FOUND", 404, "Bean not found.");
      }

      if (existing.version !== canonicalPayload.expectedVersion) {
        throw new CoffeeChatError(
          "VERSION_CONFLICT",
          409,
          `Bean version conflict: expected ${canonicalPayload.expectedVersion}, latest is ${existing.version}.`,
          { latestVersion: existing.version },
        );
      }

      const [latestRev] = await tx
        .select({ revisionNumber: beanRevisions.revisionNumber })
        .from(beanRevisions)
        .where(eq(beanRevisions.beanId, beanId))
        .orderBy(desc(beanRevisions.revisionNumber))
        .limit(1);

      nextVersion = existing.version + 1;
      nextRevisionNumber = (latestRev?.revisionNumber ?? 0) + 1;
      const revisionId = randomUUID();

      await tx.insert(beanRevisions).values({
        id: revisionId,
        beanId,
        revisionNumber: nextRevisionNumber,
        title: canonicalPayload.title,
        take: canonicalPayload.take,
        tradeoff: canonicalPayload.tradeoff,
        boundary: canonicalPayload.boundary,
        uncertainty: canonicalPayload.uncertainty,
        tags: canonicalPayload.tags,
        originsJson: resolvedOrigins,
        searchDocument,
        payloadDigest: computedDigest,
        attestationKind,
      });

      const updated = await tx
        .update(beans)
        .set({
          visibility: canonicalPayload.visibility,
          currentRevisionId: revisionId,
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(beans.id, beanId),
            eq(beans.ownerId, ownerId),
            eq(beans.version, canonicalPayload.expectedVersion!),
          ),
        )
        .returning({ id: beans.id });

      if (updated.length === 0) {
        throw new CoffeeChatError(
          "VERSION_CONFLICT",
          409,
          "Concurrent modification detected.",
        );
      }

      // Replace active origin joins & outgoing relations for current revision.
      await tx.delete(beanOrigins).where(eq(beanOrigins.beanId, beanId));
      await tx
        .delete(beanRelations)
        .where(
          and(
            eq(beanRelations.ownerId, ownerId),
            eq(beanRelations.fromBeanId, beanId),
          ),
        );
    }

    for (let idx = 0; idx < resolvedOrigins.length; idx++) {
      const origin = resolvedOrigins[idx]!;
      if (origin.originId) {
        await tx.insert(beanOrigins).values({
          id: randomUUID(),
          beanId,
          originId: origin.originId,
          position: idx,
        });
      }
    }

    for (const rel of canonicalPayload.relations) {
      await tx.insert(beanRelations).values({
        id: randomUUID(),
        ownerId,
        fromBeanId: beanId,
        toBeanId: rel.toBeanId,
        kind: rel.kind,
        note: rel.note,
      });
    }

    await tx.insert(mutationReceipts).values({
      id: randomUUID(),
      ownerId,
      operationKey: input.operationKey,
      action: "save_bean",
      requestDigest: computedDigest,
      resultJson: {
        beanId,
        version: nextVersion,
        revisionNumber: nextRevisionNumber,
      },
    });

    return beanId;
  });

  const detail = await getBean(db, ownerId, savedBeanId);
  return { bean: detail, replayed: false };
}

/**
 * Transitions a Bean between private and public with optimistic locking,
 * idempotency, and work_episode redaction check.
 */
export async function setBeanVisibility(
  db: CoffeeChatDb,
  ownerId: string,
  rawInput: SetVisibilityInput,
): Promise<{ bean: BeanDetail; replayed: boolean }> {
  const parsed = setVisibilityInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  const input = parsed.data;
  const { digest: requestDigest } = computeJcsDigest({
    action: "set_bean_visibility",
    beanId: input.beanId,
    visibility: input.visibility,
    expectedVersion: input.expectedVersion,
  });

  const [existingReceipt] = await db
    .select()
    .from(mutationReceipts)
    .where(
      and(
        eq(mutationReceipts.ownerId, ownerId),
        eq(mutationReceipts.operationKey, input.operationKey),
      ),
    )
    .limit(1);

  if (existingReceipt) {
    if (
      existingReceipt.action !== "set_bean_visibility" ||
      existingReceipt.requestDigest !== requestDigest
    ) {
      throw new CoffeeChatError(
        "IDEMPOTENCY_CONFLICT",
        409,
        "operationKey was already used with a different visibility request.",
      );
    }
    const detail = await getBean(db, ownerId, input.beanId);
    return { bean: detail, replayed: true };
  }

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(beans)
      .where(eq(beans.id, input.beanId))
      .limit(1);

    if (!existing || existing.ownerId !== ownerId) {
      throw new CoffeeChatError("NOT_FOUND", 404, "Bean not found.");
    }

    if (existing.version !== input.expectedVersion) {
      throw new CoffeeChatError(
        "VERSION_CONFLICT",
        409,
        `Bean version conflict: expected ${input.expectedVersion}, latest is ${existing.version}.`,
        { latestVersion: existing.version },
      );
    }

    if (input.visibility === "public" && existing.currentRevisionId) {
      const [rev] = await tx
        .select({ originsJson: beanRevisions.originsJson })
        .from(beanRevisions)
        .where(eq(beanRevisions.id, existing.currentRevisionId))
        .limit(1);

      const hasWorkEpisode = (rev?.originsJson ?? []).some(
        (o) => o.kind === "work_episode",
      );
      if (hasWorkEpisode && !input.redactionConfirmed) {
        throw new CoffeeChatError(
          "REDACTION_REQUIRED",
          400,
          "Publishing a work_episode Bean requires redactionConfirmed=true.",
        );
      }
    }

    const nextVersion = existing.version + 1;
    const updated = await tx
      .update(beans)
      .set({
        visibility: input.visibility,
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(beans.id, input.beanId),
          eq(beans.ownerId, ownerId),
          eq(beans.version, input.expectedVersion),
        ),
      )
      .returning({ id: beans.id });

    if (updated.length === 0) {
      throw new CoffeeChatError(
        "VERSION_CONFLICT",
        409,
        "Concurrent modification detected.",
      );
    }

    await tx.insert(mutationReceipts).values({
      id: randomUUID(),
      ownerId,
      operationKey: input.operationKey,
      action: "set_bean_visibility",
      requestDigest,
      resultJson: {
        beanId: input.beanId,
        visibility: input.visibility,
        version: nextVersion,
      },
    });
  });

  const detail = await getBean(db, ownerId, input.beanId);
  return { bean: detail, replayed: false };
}

/**
 * Hard-deletes a Bean, its revisions, origin links, relation edges, and Shelf references
 * while retaining a content-free mutation receipt so replay never resurrects it.
 */
export async function deleteBean(
  db: CoffeeChatDb,
  ownerId: string,
  rawInput: DeleteBeanInput,
): Promise<{ deleted: true; beanId: string; replayed: boolean }> {
  const parsed = deleteBeanInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  const input = parsed.data;
  const { digest: requestDigest } = computeJcsDigest({
    action: "delete_bean",
    beanId: input.beanId,
    expectedVersion: input.expectedVersion,
  });

  const [existingReceipt] = await db
    .select()
    .from(mutationReceipts)
    .where(
      and(
        eq(mutationReceipts.ownerId, ownerId),
        eq(mutationReceipts.operationKey, input.operationKey),
      ),
    )
    .limit(1);

  if (existingReceipt) {
    if (
      existingReceipt.action !== "delete_bean" ||
      existingReceipt.requestDigest !== requestDigest
    ) {
      throw new CoffeeChatError(
        "IDEMPOTENCY_CONFLICT",
        409,
        "operationKey was already used with a different delete request.",
      );
    }
    return { deleted: true, beanId: input.beanId, replayed: true };
  }

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(beans)
      .where(eq(beans.id, input.beanId))
      .limit(1);

    if (!existing || existing.ownerId !== ownerId) {
      throw new CoffeeChatError("NOT_FOUND", 404, "Bean not found.");
    }

    if (existing.version !== input.expectedVersion) {
      throw new CoffeeChatError(
        "VERSION_CONFLICT",
        409,
        `Bean version conflict: expected ${input.expectedVersion}, latest is ${existing.version}.`,
        { latestVersion: existing.version },
      );
    }

    // Hard delete cascades revisions, bean_origins, bean_relations, and shelf_items.
    await tx
      .delete(beans)
      .where(and(eq(beans.id, input.beanId), eq(beans.ownerId, ownerId)));

    // Keep content-free receipt for idempotency & non-resurrection.
    await tx.insert(mutationReceipts).values({
      id: randomUUID(),
      ownerId,
      operationKey: input.operationKey,
      action: "delete_bean",
      requestDigest,
      resultJson: {
        deleted: true,
        beanId: input.beanId,
      },
    });
  });

  return { deleted: true, beanId: input.beanId, replayed: false };
}

async function hydrateRelationsForBean(
  db: CoffeeChatDb,
  beanId: string,
  ownerId: string,
  viewerId: string | null,
): Promise<BeanRelationView[]> {
  const isOwner = viewerId !== null && viewerId === ownerId;
  const rows = await db
    .select()
    .from(beanRelations)
    .where(
      or(
        eq(beanRelations.fromBeanId, beanId),
        eq(beanRelations.toBeanId, beanId),
      ),
    );

  if (rows.length === 0) return [];

  const relatedIds = Array.from(
    new Set(
      rows.map((r) => (r.fromBeanId === beanId ? r.toBeanId : r.fromBeanId)),
    ),
  );

  const relatedBeans = await db
    .select({
      id: beans.id,
      visibility: beans.visibility,
      currentRevisionId: beans.currentRevisionId,
    })
    .from(beans)
    .where(inArray(beans.id, relatedIds));

  const relatedMap = new Map(relatedBeans.map((b) => [b.id, b]));
  const revIds = relatedBeans
    .map((b) => b.currentRevisionId)
    .filter((id): id is string => Boolean(id));

  const revRows =
    revIds.length > 0
      ? await db
          .select({ id: beanRevisions.id, title: beanRevisions.title })
          .from(beanRevisions)
          .where(inArray(beanRevisions.id, revIds))
      : [];
  const revTitleMap = new Map(revRows.map((r) => [r.id, r.title]));

  const views: BeanRelationView[] = [];
  for (const row of rows) {
    const direction = row.fromBeanId === beanId ? "outgoing" : "incoming";
    const relatedBeanId = direction === "outgoing" ? row.toBeanId : row.fromBeanId;
    const relatedBean = relatedMap.get(relatedBeanId);
    if (!relatedBean) continue;
    // Zero Graph Leakage invariant: non-owners NEVER see edges touching private Beans.
    if (!isOwner && relatedBean.visibility !== "public") continue;

    views.push({
      id: row.id,
      direction,
      kind: row.kind as RelationKind,
      relatedBeanId,
      relatedBeanTitle:
        (relatedBean.currentRevisionId &&
          revTitleMap.get(relatedBean.currentRevisionId)) ||
        "",
      note: row.note,
    });
  }

  return views;
}

/**
 * Retrieves full Bean detail with strict visibility enforcement.
 * Unauthorized lookup of a private Bean returns 404 NOT_FOUND without leaking existence.
 */
export async function getBean(
  db: CoffeeChatDb,
  viewerId: string | null,
  beanId: string,
): Promise<BeanDetail> {
  const [row] = await db
    .select({
      bean: beans,
      owner: users,
    })
    .from(beans)
    .innerJoin(users, eq(beans.ownerId, users.id))
    .where(eq(beans.id, beanId))
    .limit(1);

  if (!row) {
    throw new CoffeeChatError("NOT_FOUND", 404, "Bean not found.");
  }

  const isOwner = viewerId !== null && viewerId === row.bean.ownerId;
  if (!isOwner && row.bean.visibility !== "public") {
    throw new CoffeeChatError("NOT_FOUND", 404, "Bean not found.");
  }

  if (!row.bean.currentRevisionId) {
    throw new CoffeeChatError("NOT_FOUND", 404, "Bean revision not found.");
  }

  const [rev] = await db
    .select()
    .from(beanRevisions)
    .where(eq(beanRevisions.id, row.bean.currentRevisionId))
    .limit(1);

  if (!rev) {
    throw new CoffeeChatError("NOT_FOUND", 404, "Bean revision not found.");
  }

  const relations = await hydrateRelationsForBean(
    db,
    row.bean.id,
    row.bean.ownerId,
    viewerId,
  );

  const supersededBy = relations.find(
    (r) => r.direction === "incoming" && r.kind === "supersedes",
  );
  const hasTension = relations.some((r) => r.kind === "tensions_with");

  let revisionsHistory: BeanDetail["revisions"] = undefined;
  if (isOwner) {
    const allRevs = await db
      .select()
      .from(beanRevisions)
      .where(eq(beanRevisions.beanId, row.bean.id))
      .orderBy(desc(beanRevisions.revisionNumber));
    revisionsHistory = allRevs.map((r) => ({
      revisionNumber: r.revisionNumber,
      title: r.title,
      take: r.take,
      tradeoff: r.tradeoff,
      boundary: r.boundary,
      payloadDigest: r.payloadDigest,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  const originsList = (rev.originsJson ?? []) as NormalizedOrigin[];
  const originKinds = Array.from(
    new Set(originsList.map((o) => o.kind)),
  ) as OriginKind[];

  return {
    id: row.bean.id,
    ownerId: row.bean.ownerId,
    ownerHandle: row.owner.handle,
    ownerDisplayName: row.owner.name,
    visibility: row.bean.visibility as Visibility,
    version: row.bean.version,
    revisionNumber: rev.revisionNumber,
    title: rev.title,
    tradeoffPreview: rev.tradeoff.slice(0, 140),
    take: rev.take,
    tradeoff: rev.tradeoff,
    boundary: rev.boundary,
    uncertainty: rev.uncertainty,
    tags: (rev.tags ?? []) as string[],
    originKinds,
    origins: originsList,
    relations,
    supersededByBeanId: supersededBy?.relatedBeanId ?? null,
    hasTension,
    payloadDigest: rev.payloadDigest,
    attestationKind: rev.attestationKind as AttestationKind,
    createdAt: row.bean.createdAt.toISOString(),
    updatedAt: row.bean.updatedAt.toISOString(),
    ...(revisionsHistory ? { revisions: revisionsHistory } : {}),
  };
}

export interface ListBeansFilter {
  scope?: "mine" | "public" | "shelf" | "all_accessible";
  query?: string;
  tag?: string;
  ownerHandle?: string;
  originUrl?: string;
  visibility?: Visibility;
  limit?: number;
}

/**
 * Deterministic Zero-AI Postgres search (tsvector + ILIKE fallback) returning compact
 * Bean summaries with visibility-safe relation indicators.
 */
export async function listBeans(
  db: CoffeeChatDb,
  viewerId: string | null,
  filter: ListBeansFilter = {},
): Promise<BeanSummary[]> {
  const scope = filter.scope ?? (viewerId ? "mine" : "public");
  const limit = Math.min(Math.max(filter.limit ?? 30, 1), 100);

  if ((scope === "mine" || scope === "shelf") && !viewerId) {
    throw new CoffeeChatError(
      "UNAUTHORIZED",
      401,
      "Authentication required for this scope.",
    );
  }

  let shelfPersonIds: string[] = [];
  let shelfBeanIds: string[] = [];
  if (scope === "shelf" || (scope === "all_accessible" && viewerId)) {
    const shelfRows = await db
      .select()
      .from(shelfItems)
      .where(eq(shelfItems.userId, viewerId!));
    shelfPersonIds = shelfRows
      .filter((s) => s.targetType === "person" && s.targetUserId)
      .map((s) => s.targetUserId!);
    shelfBeanIds = shelfRows
      .filter((s) => s.targetType === "bean" && s.targetBeanId)
      .map((s) => s.targetBeanId!);
  }

  const conditions = [];

  if (scope === "mine") {
    conditions.push(eq(beans.ownerId, viewerId!));
    if (filter.visibility) {
      conditions.push(eq(beans.visibility, filter.visibility));
    }
  } else if (scope === "public") {
    conditions.push(eq(beans.visibility, "public"));
  } else if (scope === "shelf") {
    if (shelfPersonIds.length === 0 && shelfBeanIds.length === 0) {
      return [];
    }
    const shelfConds = [];
    if (shelfPersonIds.length > 0) {
      shelfConds.push(inArray(beans.ownerId, shelfPersonIds));
    }
    if (shelfBeanIds.length > 0) {
      shelfConds.push(inArray(beans.id, shelfBeanIds));
    }
    conditions.push(eq(beans.visibility, "public"));
    conditions.push(or(...shelfConds));
  } else {
    // all_accessible: own beans + public beans
    if (viewerId) {
      conditions.push(
        or(eq(beans.ownerId, viewerId), eq(beans.visibility, "public")),
      );
    } else {
      conditions.push(eq(beans.visibility, "public"));
    }
  }

  if (filter.ownerHandle) {
    const cleanHandle = filter.ownerHandle.replace(/^@/, "").trim().toLowerCase();
    conditions.push(eq(users.handle, cleanHandle));
  }

  if (filter.originUrl) {
    const { normalizedUrl } = normalizeOriginUrl(filter.originUrl);
    const [originRow] = await db
      .select({ id: origins.id })
      .from(origins)
      .where(eq(origins.normalizedUrl, normalizedUrl))
      .limit(1);
    if (!originRow) return [];
    const matchingLinks = await db
      .select({ beanId: beanOrigins.beanId })
      .from(beanOrigins)
      .where(eq(beanOrigins.originId, originRow.id));
    if (matchingLinks.length === 0) return [];
    conditions.push(
      inArray(
        beans.id,
        matchingLinks.map((m) => m.beanId),
      ),
    );
  }

  if (filter.query && filter.query.trim().length > 0) {
    const q = filter.query.trim();
    const pattern = `%${q}%`;
    conditions.push(
      or(
        sql`to_tsvector('simple', ${beanRevisions.searchDocument}) @@ plainto_tsquery('simple', ${q})`,
        sql`${beanRevisions.searchDocument} ILIKE ${pattern}`,
      ),
    );
  }

  const rows = await db
    .select({
      bean: beans,
      rev: beanRevisions,
      owner: users,
    })
    .from(beans)
    .innerJoin(beanRevisions, eq(beans.currentRevisionId, beanRevisions.id))
    .innerJoin(users, eq(beans.ownerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(beans.updatedAt))
    .limit(limit);

  const cleanTag = filter.tag?.trim().toLowerCase();
  const filteredRows = cleanTag
    ? rows.filter((r) => ((r.rev.tags ?? []) as string[]).includes(cleanTag))
    : rows;

  const summaries: BeanSummary[] = [];
  for (const r of filteredRows) {
    const rels = await hydrateRelationsForBean(
      db,
      r.bean.id,
      r.bean.ownerId,
      viewerId,
    );
    const supersededBy = rels.find(
      (rel) => rel.direction === "incoming" && rel.kind === "supersedes",
    );
    const hasTension = rels.some((rel) => rel.kind === "tensions_with");
    const originsList = (r.rev.originsJson ?? []) as NormalizedOrigin[];

    summaries.push({
      id: r.bean.id,
      ownerId: r.bean.ownerId,
      ownerHandle: r.owner.handle,
      ownerDisplayName: r.owner.name,
      visibility: r.bean.visibility as Visibility,
      version: r.bean.version,
      revisionNumber: r.rev.revisionNumber,
      title: r.rev.title,
      tradeoffPreview: r.rev.tradeoff.slice(0, 140),
      tags: (r.rev.tags ?? []) as string[],
      originKinds: Array.from(
        new Set(originsList.map((o) => o.kind)),
      ) as OriginKind[],
      supersededByBeanId: supersededBy?.relatedBeanId ?? null,
      hasTension,
      updatedAt: r.bean.updatedAt.toISOString(),
    });
  }

  return summaries;
}

/**
 * Public Person Page view:
 * Exposes aggregate publicCount AND privateCount publicly,
 * while strictly returning ONLY public Beans with public-only relations.
 */
export async function getPersonProfile(
  db: CoffeeChatDb,
  viewerId: string | null,
  handle: string,
): Promise<PersonProfileView> {
  const cleanHandle = handle.replace(/^@/, "").trim().toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.handle, cleanHandle))
    .limit(1);

  if (!user) {
    throw new CoffeeChatError("NOT_FOUND", 404, `Person @${cleanHandle} not found.`);
  }

  const allCounts = await db
    .select({
      visibility: beans.visibility,
      id: beans.id,
    })
    .from(beans)
    .where(eq(beans.ownerId, user.id))
    .orderBy(desc(beans.updatedAt));

  let publicCount = 0;
  let privateCount = 0;
  const publicIds: string[] = [];

  for (const row of allCounts) {
    if (row.visibility === "public") {
      publicCount++;
      publicIds.push(row.id);
    } else {
      privateCount++;
    }
  }

  const publicBeans: BeanDetail[] = [];
  for (const id of publicIds) {
    // Pass null viewerId for public profile rendering so private relations are never leaked.
    publicBeans.push(await getBean(db, null, id));
  }

  return {
    userId: user.id,
    handle: user.handle,
    displayName: user.name,
    publicCount,
    privateCount,
    publicBeans,
  };
}

/**
 * Source Compare view: returns normalized URL + all currently public Beans referencing it.
 * Private-only URLs return 404 NOT_FOUND to non-owners.
 */
export async function getSourceCompare(
  db: CoffeeChatDb,
  originIdOrUrl: string,
): Promise<SourceCompareView> {
  let originRow: { id: string; normalizedUrl: string | null } | undefined;

  if (
    originIdOrUrl.startsWith("http://") ||
    originIdOrUrl.startsWith("https://")
  ) {
    const { normalizedUrl } = normalizeOriginUrl(originIdOrUrl);
    const [found] = await db
      .select({ id: origins.id, normalizedUrl: origins.normalizedUrl })
      .from(origins)
      .where(eq(origins.normalizedUrl, normalizedUrl))
      .limit(1);
    originRow = found;
  } else {
    const [found] = await db
      .select({ id: origins.id, normalizedUrl: origins.normalizedUrl })
      .from(origins)
      .where(eq(origins.id, originIdOrUrl))
      .limit(1);
    originRow = found;
  }

  if (!originRow || !originRow.normalizedUrl) {
    throw new CoffeeChatError("NOT_FOUND", 404, "Public source not found.");
  }

  const links = await db
    .select({ beanId: beanOrigins.beanId })
    .from(beanOrigins)
    .innerJoin(beans, eq(beanOrigins.beanId, beans.id))
    .where(
      and(
        eq(beanOrigins.originId, originRow.id),
        eq(beans.visibility, "public"),
      ),
    );

  const uniqueBeanIds = Array.from(new Set(links.map((l) => l.beanId)));
  if (uniqueBeanIds.length === 0) {
    throw new CoffeeChatError("NOT_FOUND", 404, "Public source not found.");
  }

  const publicBeans: BeanDetail[] = [];
  for (const id of uniqueBeanIds) {
    publicBeans.push(await getBean(db, null, id));
  }

  return {
    originId: originRow.id,
    normalizedUrl: originRow.normalizedUrl,
    publicBeanCount: publicBeans.length,
    beans: publicBeans,
  };
}

export async function listPublicSources(
  db: CoffeeChatDb,
  limit = 20,
): Promise<Array<{ originId: string; normalizedUrl: string; publicBeanCount: number }>> {
  const rows = await db
    .select({
      originId: origins.id,
      normalizedUrl: origins.normalizedUrl,
      beanId: beans.id,
    })
    .from(origins)
    .innerJoin(beanOrigins, eq(origins.id, beanOrigins.originId))
    .innerJoin(beans, eq(beanOrigins.beanId, beans.id))
    .where(
      and(
        eq(origins.kind, "source_excerpt"),
        eq(beans.visibility, "public"),
      ),
    );

  const map = new Map<string, { originId: string; normalizedUrl: string; beanIds: Set<string> }>();
  for (const r of rows) {
    if (!r.normalizedUrl) continue;
    const entry = map.get(r.originId) ?? {
      originId: r.originId,
      normalizedUrl: r.normalizedUrl,
      beanIds: new Set<string>(),
    };
    entry.beanIds.add(r.beanId);
    map.set(r.originId, entry);
  }

  return Array.from(map.values())
    .map((e) => ({
      originId: e.originId,
      normalizedUrl: e.normalizedUrl,
      publicBeanCount: e.beanIds.size,
    }))
    .sort((a, b) => b.publicBeanCount - a.publicBeanCount)
    .slice(0, limit);
}

/**
 * Side-by-side perspective comparison across a URL or topic query (and optional @handles).
 */
export async function comparePerspectives(
  db: CoffeeChatDb,
  viewerId: string | null,
  input: {
    url?: string;
    query?: string;
    handles?: string[];
  },
): Promise<{
  subject: string;
  perspectives: BeanDetail[];
}> {
  if (input.url) {
    const sourceView = await getSourceCompare(db, input.url);
    const cleanHandles = input.handles?.map((h) =>
      h.replace(/^@/, "").trim().toLowerCase(),
    );
    const filtered =
      cleanHandles && cleanHandles.length > 0
        ? sourceView.beans.filter((b) => cleanHandles.includes(b.ownerHandle))
        : sourceView.beans;
    return {
      subject: sourceView.normalizedUrl,
      perspectives: filtered,
    };
  }

  const summaries = await listBeans(db, viewerId, {
    scope: viewerId ? "all_accessible" : "public",
    query: input.query,
    limit: 20,
  });

  const cleanHandles = input.handles?.map((h) =>
    h.replace(/^@/, "").trim().toLowerCase(),
  );
  const matching =
    cleanHandles && cleanHandles.length > 0
      ? summaries.filter((s) => cleanHandles.includes(s.ownerHandle))
      : summaries;

  const details: BeanDetail[] = [];
  for (const s of matching.slice(0, 6)) {
    details.push(await getBean(db, viewerId, s.id));
  }

  return {
    subject: input.query?.trim() || "Confirmed Perspectives",
    perspectives: details,
  };
}

/**
 * Owner-only export of own Beans, origins, relations, and revision history.
 */
export async function exportUserBeans(
  db: CoffeeChatDb,
  ownerId: string,
  format: "json" | "markdown",
): Promise<{ contentType: string; filename: string; body: string }> {
  const summaries = await listBeans(db, ownerId, {
    scope: "mine",
    limit: 100,
  });

  const fullBeans: BeanDetail[] = [];
  for (const s of summaries) {
    fullBeans.push(await getBean(db, ownerId, s.id));
  }

  if (format === "json") {
    return {
      contentType: "application/json; charset=utf-8",
      filename: "coffee-chat-beans.json",
      body: JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          count: fullBeans.length,
          beans: fullBeans,
        },
        null,
        2,
      ),
    };
  }

  const mdParts = [
    "# Coffee Chat Export",
    "",
    `Exported ${fullBeans.length} confirmed Beans.`,
    "",
  ];
  for (const b of fullBeans) {
    mdParts.push(`## ${b.title}`);
    mdParts.push(
      `- **ID:** \`${b.id}\` | **Visibility:** ${b.visibility} | **Version:** ${b.version} (rev ${b.revisionNumber})`,
    );
    if (b.tags.length) mdParts.push(`- **Tags:** ${b.tags.join(", ")}`);
    mdParts.push("", `### Take`, b.take, "", `### Priority & Trade-off`, b.tradeoff, "", `### Boundary`, b.boundary);
    if (b.uncertainty) mdParts.push("", `### Uncertainty`, b.uncertainty);
    mdParts.push("", "### Origins");
    for (const o of b.origins) {
      if (o.kind === "source_excerpt") {
        mdParts.push(
          `- [Source] ${o.sourceTitle ?? o.url} (${o.url})${o.locator ? ` @ ${o.locator}` : ""}${o.quotation ? `\n  > "${o.quotation}"` : ""}`,
        );
      } else {
        mdParts.push(`- [Work Episode] ${o.episodeSummary}`);
      }
    }
    if (b.relations.length) {
      mdParts.push("", "### Relations");
      for (const r of b.relations) {
        mdParts.push(
          `- ${r.direction} \`${r.kind}\` → ${r.relatedBeanTitle} (\`${r.relatedBeanId}\`)${r.note ? `: ${r.note}` : ""}`,
        );
      }
    }
    mdParts.push("", "---", "");
  }

  return {
    contentType: "text/markdown; charset=utf-8",
    filename: "coffee-chat-beans.md",
    body: mdParts.join("\n"),
  };
}
