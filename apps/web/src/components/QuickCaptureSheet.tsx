"use client";

import { useEffect, useState } from "react";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Checkbox } from "@openboa/yogurt/checkbox";
import { DisclosureRow } from "@openboa/yogurt/disclosure-row";
import { Divider } from "@openboa/yogurt/divider";
import { Inline } from "@openboa/yogurt/inline";
import { Notice } from "@openboa/yogurt/notice";
import { Progress } from "@openboa/yogurt/progress";
import { SegmentedControl } from "@openboa/yogurt/segmented-control";
import { Select } from "@openboa/yogurt/select";
import { Sheet } from "@openboa/yogurt/sheet";
import { Stack } from "@openboa/yogurt/stack";
import { Surface } from "@openboa/yogurt/surface";
import { Switch } from "@openboa/yogurt/switch";
import { Text } from "@openboa/yogurt/text";
import { TextField } from "@openboa/yogurt/text-field";
import { Textarea } from "@openboa/yogurt/textarea";
import type {
  BeanDetail,
  BeanSummary,
  OriginKind,
  RelationKind,
  Visibility,
} from "@coffee-chat/core";

export interface DraftOrigin {
  kind: OriginKind;
  url: string;
  sourceTitle: string;
  quotation: string;
  locator: string;
  episodeSummary: string;
}

export interface DraftRelation {
  toBeanId: string;
  kind: RelationKind;
  note: string;
}

export interface QuickCaptureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingBeans: Array<Pick<BeanSummary, "id" | "title">>;
  editingBean?: BeanDetail | null;
  initialUrl?: string;
  initialSourceTitle?: string;
  initialRelations?: DraftRelation[];
  onSaved: (bean: BeanDetail) => void;
  onReloadLatest?: (beanId: string) => Promise<BeanDetail | null>;
}

function emptyReadingOrigin(url = "", sourceTitle = ""): DraftOrigin {
  return {
    kind: "source_excerpt",
    url,
    sourceTitle,
    quotation: "",
    locator: "",
    episodeSummary: "",
  };
}

function emptyWorkOrigin(): DraftOrigin {
  return {
    kind: "work_episode",
    url: "",
    sourceTitle: "",
    quotation: "",
    locator: "",
    episodeSummary: "",
  };
}

export function QuickCaptureSheet({
  open,
  onOpenChange,
  existingBeans,
  editingBean = null,
  initialUrl = "",
  initialSourceTitle = "",
  initialRelations = [],
  onSaved,
  onReloadLatest,
}: QuickCaptureSheetProps) {
  const [stage, setStage] = useState<1 | 2>(1);
  const [origins, setOrigins] = useState<DraftOrigin[]>([
    emptyReadingOrigin(initialUrl, initialSourceTitle),
  ]);
  const [title, setTitle] = useState("");
  const [take, setTake] = useState("");
  const [tradeoff, setTradeoff] = useState("");
  const [boundary, setBoundary] = useState("");
  const [uncertainty, setUncertainty] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [redactionConfirmed, setRedactionConfirmed] = useState(false);
  const [relations, setRelations] = useState<DraftRelation[]>(initialRelations);
  const [newRelTarget, setNewRelTarget] = useState("");
  const [newRelKind, setNewRelKind] = useState<RelationKind>("refines");
  const [newRelNote, setNewRelNote] = useState("");
  const [expectedVersion, setExpectedVersion] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versionConflict, setVersionConflict] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setVersionConflict(null);
    setStage(1);
    if (editingBean) {
      setExpectedVersion(editingBean.version);
      setTitle(editingBean.title);
      setTake(editingBean.take);
      setTradeoff(editingBean.tradeoff);
      setBoundary(editingBean.boundary);
      setUncertainty(editingBean.uncertainty ?? "");
      setTagsText(editingBean.tags.join(", "));
      setVisibility(editingBean.visibility);
      setRedactionConfirmed(editingBean.visibility === "public");
      setOrigins(
        editingBean.origins.length > 0
          ? editingBean.origins.map((o) => ({
              kind: o.kind,
              url: o.url ?? "",
              sourceTitle: o.sourceTitle ?? "",
              quotation: o.quotation ?? "",
              locator: o.locator ?? "",
              episodeSummary: o.episodeSummary ?? "",
            }))
          : [emptyReadingOrigin()],
      );
      setRelations(
        editingBean.relations
          .filter((r) => r.direction === "outgoing")
          .map((r) => ({
            toBeanId: r.relatedBeanId,
            kind: r.kind,
            note: r.note ?? "",
          })),
      );
    } else {
      setExpectedVersion(null);
      setTitle("");
      setTake("");
      setTradeoff("");
      setBoundary("");
      setUncertainty("");
      setTagsText("");
      setVisibility("private");
      setRedactionConfirmed(false);
      setOrigins([emptyReadingOrigin(initialUrl, initialSourceTitle)]);
      setRelations(initialRelations);
    }
    setNewRelTarget("");
    setNewRelKind("refines");
    setNewRelNote("");
  }, [open, editingBean, initialUrl, initialSourceTitle, initialRelations]);

  const hasWorkOrigin = origins.some((o) => o.kind === "work_episode");
  const needsRedaction = visibility === "public" && hasWorkOrigin;

  const updateOrigin = (idx: number, patch: Partial<DraftOrigin>) => {
    setOrigins((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  };

  const addOriginRow = () => {
    if (origins.length >= 8) return;
    setOrigins((prev) => [...prev, emptyWorkOrigin()]);
  };

  const removeOriginRow = (idx: number) => {
    if (origins.length <= 1) return;
    setOrigins((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateStage1 = (): string | null => {
    if (!title.trim()) return "Add a concise headline for your Bean.";
    if (!take.trim()) return "Describe your take (what clicked for you).";
    for (let i = 0; i < origins.length; i++) {
      const o = origins[i]!;
      if (o.kind === "source_excerpt" && !o.url.trim()) {
        return `Origin #${i + 1}: enter an HTTP(S) URL for this Reading Origin.`;
      }
      if (o.kind === "work_episode" && !o.episodeSummary.trim()) {
        return `Origin #${i + 1}: summarize the work call for this Work Origin.`;
      }
    }
    return null;
  };

  const handleContinue = () => {
    const err = validateStage1();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStage(2);
  };

  const selectableTargets = existingBeans.filter(
    (b) => !editingBean || b.id !== editingBean.id,
  );

  const handleAddRelation = () => {
    if (!newRelTarget) return;
    const dup = relations.some(
      (r) => r.toBeanId === newRelTarget && r.kind === newRelKind,
    );
    if (dup) {
      setError("That relation is already attached.");
      return;
    }
    setRelations((prev) => [
      ...prev,
      { toBeanId: newRelTarget, kind: newRelKind, note: newRelNote.trim() },
    ]);
    setNewRelTarget("");
    setNewRelNote("");
    setError(null);
  };

  const handleReloadLatest = async () => {
    if (!editingBean || !onReloadLatest) return;
    const latest = await onReloadLatest(editingBean.id);
    if (latest) {
      setExpectedVersion(latest.version);
      setVersionConflict(null);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    const stage1Err = validateStage1();
    if (stage1Err) {
      setError(stage1Err);
      setStage(1);
      return;
    }
    if (!tradeoff.trim()) {
      setError("State the Trade-off (what mattered more).");
      return;
    }
    if (!boundary.trim()) {
      setError("State the Boundary (when it doesn't apply).");
      return;
    }
    if (needsRedaction && !redactionConfirmed) {
      setError(
        "Confirm that private or confidential work details were removed before putting this Bean On the Table.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setVersionConflict(null);
    try {
      const normalizedOrigins = origins.map((o) =>
        o.kind === "source_excerpt"
          ? {
              kind: "source_excerpt" as const,
              url: o.url.trim(),
              sourceTitle: o.sourceTitle.trim() || null,
              quotation: o.quotation.trim() || null,
              locator: o.locator.trim() || null,
            }
          : {
              kind: "work_episode" as const,
              episodeSummary: o.episodeSummary.trim(),
              locator: o.locator.trim() || null,
            },
      );

      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const prepRes = await fetch("/api/beans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "prepare",
          input: {
            beanId: editingBean ? editingBean.id : null,
            expectedVersion: editingBean ? expectedVersion : null,
            title: title.trim(),
            take: take.trim(),
            tradeoff: tradeoff.trim(),
            boundary: boundary.trim(),
            uncertainty: uncertainty.trim() || null,
            tags,
            visibility,
            origins: normalizedOrigins,
            relations: relations.map((r) => ({
              toBeanId: r.toBeanId,
              kind: r.kind,
              note: r.note || null,
            })),
          },
        }),
      });
      const prepData = (await prepRes.json()) as {
        prepared?: {
          canonicalPayload: Record<string, unknown>;
          digest: string;
          operationKey: string;
        };
        code?: string;
        message?: string;
        details?: { latestVersion?: number };
      };
      if (!prepRes.ok || !prepData.prepared) {
        if (prepData.code === "VERSION_CONFLICT") {
          setVersionConflict(prepData.details?.latestVersion ?? null);
        }
        throw new Error(prepData.message ?? "Could not prepare Bean.");
      }

      const saveRes = await fetch("/api/beans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...prepData.prepared.canonicalPayload,
          digest: prepData.prepared.digest,
          operationKey: prepData.prepared.operationKey,
          attestationKind: "ui_attested",
          redactionConfirmed,
        }),
      });
      const saveData = (await saveRes.json()) as {
        bean?: BeanDetail;
        code?: string;
        message?: string;
        details?: { latestVersion?: number };
      };
      if (!saveRes.ok || !saveData.bean) {
        if (saveData.code === "VERSION_CONFLICT") {
          setVersionConflict(saveData.details?.latestVersion ?? null);
        }
        throw new Error(saveData.message ?? "Could not save Bean.");
      }

      onSaved(saveData.bean);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save Bean.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={editingBean ? "Re-roast Bean" : "Roast a Bean"}
      description={
        editingBean
          ? "Update your confirmed take — records a new immutable Roast Log revision"
          : "Capture & confirm a take — Stage 1 Spark → Stage 2 Trade-off & Boundary"
      }
    >
      <Stack gap={16}>
        <Stack gap={8}>
          <Inline justify="between" align="center" gap={8}>
            <Badge tone="neutral" dot={false}>
              Stage {stage} of 2 ·{" "}
              {stage === 1
                ? "Quick Spark (Origins & Take)"
                : "Roast & Confirm (Criteria & Visibility)"}
            </Badge>
            <Badge tone="neutral" dot={false}>
              {origins.length}/8 origins
            </Badge>
          </Inline>
          <Progress
            label="Roast progress"
            presentation="segmented"
            segments={2}
            value={stage}
            max={2}
          />
        </Stack>

        {versionConflict !== null ? (
          <Notice
            title="Newer revision detected (409 Version Conflict)"
            tone="warning"
            action={
              onReloadLatest ? (
                <Button
                  emphasis="soft"
                  size="compact"
                  onClick={handleReloadLatest}
                >
                  Reload latest version (v{versionConflict})
                </Button>
              ) : undefined
            }
          >
            Another update changed this Bean while you were editing. Your draft text is preserved—
            sync the latest version number before saving again.
          </Notice>
        ) : null}

        {error ? (
          <Notice title="Check your Bean details" tone="danger">
            {error}
          </Notice>
        ) : null}

        {stage === 1 ? (
          <Stack gap={16}>
            <Stack gap={12}>
              <Inline justify="between" align="center" gap={8}>
                <Text variant="meta">Origins · Where this came from (1–8)</Text>
                <Button
                  emphasis="soft"
                  size="compact"
                  disabled={origins.length >= 8}
                  onClick={addOriginRow}
                >
                  + Add another origin
                </Button>
              </Inline>

              {origins.map((origin, idx) => (
                <Surface key={idx} variant="surface" density="compact">
                  <Stack gap={12}>
                    <Inline justify="between" align="center" gap={8}>
                      <SegmentedControl
                        label={`Origin ${idx + 1} type`}
                        value={origin.kind}
                        onValueChange={(val) =>
                          updateOrigin(idx, { kind: val as OriginKind })
                        }
                        options={[
                          { id: "source_excerpt", label: "Reading Origin" },
                          { id: "work_episode", label: "Work Origin" },
                        ]}
                      />
                      {origins.length > 1 ? (
                        <Button
                          emphasis="quiet"
                          size="compact"
                          onClick={() => removeOriginRow(idx)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </Inline>

                    {origin.kind === "source_excerpt" ? (
                      <Stack gap={8}>
                        <TextField
                          label="Source URL"
                          help="From something you read (HTTP/HTTPS link)"
                          value={origin.url}
                          onChange={(e) =>
                            updateOrigin(idx, { url: e.target.value })
                          }
                          placeholder="https://example.com/article"
                        />
                        <TextField
                          label="Source Title (optional)"
                          value={origin.sourceTitle}
                          onChange={(e) =>
                            updateOrigin(idx, { sourceTitle: e.target.value })
                          }
                          placeholder="Article or paper title"
                        />
                        <Textarea
                          label="Quote (optional)"
                          help="Line or passage that stood out"
                          value={origin.quotation}
                          onChange={(e) =>
                            updateOrigin(idx, { quotation: e.target.value })
                          }
                          rows={2}
                          placeholder="Exact quote worth anchoring"
                        />
                        <TextField
                          label="Locator (optional)"
                          help="Section, timestamp, or paragraph"
                          value={origin.locator}
                          onChange={(e) =>
                            updateOrigin(idx, { locator: e.target.value })
                          }
                          placeholder="Section 3 / p. 42"
                        />
                      </Stack>
                    ) : (
                      <Stack gap={8}>
                        <Textarea
                          label="Work Moment"
                          help="From a call you made at work (decision or correction)"
                          value={origin.episodeSummary}
                          onChange={(e) =>
                            updateOrigin(idx, {
                              episodeSummary: e.target.value,
                            })
                          }
                          rows={2}
                          placeholder="e.g., Rejected silent fallback in auth middleware during review"
                        />
                        <TextField
                          label="Locator (optional)"
                          help="Project, PR, or incident reference"
                          value={origin.locator}
                          onChange={(e) =>
                            updateOrigin(idx, { locator: e.target.value })
                          }
                          placeholder="PR #142 / Q4 design review"
                        />
                      </Stack>
                    )}
                  </Stack>
                </Surface>
              ))}
            </Stack>

            <TextField
              label="Headline"
              help="One-line summary of your Bean"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Explicit failure beats silent fallback on auth boundaries"
            />

            <Textarea
              label="My Take"
              help="What clicked for you"
              value={take}
              onChange={(e) => setTake(e.target.value)}
              rows={3}
              placeholder="What insight or rule did you take away?"
            />

            <Divider />

            <Inline justify="between" align="center" gap={12}>
              <Button
                emphasis="quiet"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                emphasis="filled"
                tone="neutral"
                onClick={handleContinue}
              >
                Continue to Roast &amp; Confirm →
              </Button>
            </Inline>
          </Stack>
        ) : (
          <Stack gap={16}>
            <Textarea
              label="Trade-off"
              help="What mattered more — name what you prioritize even at a cost"
              value={tradeoff}
              onChange={(e) => setTradeoff(e.target.value)}
              rows={3}
              placeholder="e.g., Prioritize explicit errors and auditability even if onboarding takes one extra step"
            />

            <Textarea
              label="Boundary"
              help="When it doesn't apply — state where your AI should withhold this rule"
              value={boundary}
              onChange={(e) => setBoundary(e.target.value)}
              rows={2}
              placeholder="e.g., Does not apply to throwaway prototypes with no persisted user data"
            />

            <DisclosureRow label="Domains, Open Question & Relations (optional)">
              <Stack gap={12}>
                <TextField
                  label="Domains"
                  help="Decision topics, comma separated (up to 12)"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="architecture, product, hiring"
                />
                <TextField
                  label="Open Question"
                  help="What's still uncertain (optional)"
                  value={uncertainty}
                  onChange={(e) => setUncertainty(e.target.value)}
                  placeholder="Where might you revise this later?"
                />

                {selectableTargets.length > 0 ? (
                  <Stack gap={8}>
                    <Text variant="meta">
                      Connect to an existing Bean (Updated Mind / Refined / In Tension)
                    </Text>
                    <Select
                      label="Relation type"
                      value={newRelKind}
                      onChange={(e) =>
                        setNewRelKind(e.target.value as RelationKind)
                      }
                      options={[
                        {
                          id: "refines",
                          label: "Refined · Builds on earlier Bean",
                        },
                        {
                          id: "supersedes",
                          label: "Updated Mind · Replaces earlier Bean",
                        },
                        {
                          id: "tensions_with",
                          label: "In Tension · Conflicts with another Bean",
                        },
                      ]}
                    />
                    <Select
                      label="Target Bean"
                      placeholder="Select a Bean…"
                      value={newRelTarget}
                      onChange={(e) => setNewRelTarget(e.target.value)}
                      options={selectableTargets.map((b) => ({
                        id: b.id,
                        label: b.title,
                      }))}
                    />
                    <TextField
                      label="Relation note (optional)"
                      value={newRelNote}
                      onChange={(e) => setNewRelNote(e.target.value)}
                      placeholder="Why are these Beans connected?"
                    />
                    <Inline gap={8}>
                      <Button
                        emphasis="soft"
                        size="compact"
                        disabled={!newRelTarget}
                        onClick={handleAddRelation}
                      >
                        Attach relation
                      </Button>
                    </Inline>
                  </Stack>
                ) : null}

                {relations.length > 0 ? (
                  <Stack gap={8}>
                    {relations.map((rel, i) => {
                      const targetTitle =
                        existingBeans.find((b) => b.id === rel.toBeanId)?.title ??
                        rel.toBeanId;
                      return (
                        <Surface key={`${rel.toBeanId}-${rel.kind}-${i}`} variant="surface" density="compact">
                          <Inline justify="between" align="center" gap={8}>
                            <Stack gap={2}>
                              <Text variant="body">
                                {rel.kind === "supersedes"
                                  ? "Updated Mind"
                                  : rel.kind === "refines"
                                    ? "Refined"
                                    : "In Tension"}{" "}
                                → {targetTitle}
                              </Text>
                              {rel.note ? (
                                <Text variant="meta">{rel.note}</Text>
                              ) : null}
                            </Stack>
                            <Button
                              emphasis="quiet"
                              size="compact"
                              onClick={() =>
                                setRelations((prev) =>
                                  prev.filter((_, idx) => idx !== i),
                                )
                              }
                            >
                              Remove
                            </Button>
                          </Inline>
                        </Surface>
                      );
                    })}
                  </Stack>
                ) : null}
              </Stack>
            </DisclosureRow>

            <Divider />

            <Stack gap={12}>
              <Switch
                label="Put on the Table (Shared publicly)"
                help="Private by default (only you and your AI). Switch anytime."
                checked={visibility === "public"}
                onCheckedChange={(checked) => {
                  setVisibility(checked ? "public" : "private");
                  if (!checked) setRedactionConfirmed(false);
                }}
              />

              {needsRedaction ? (
                <Notice title="Work Origin privacy check" tone="warning">
                  <Stack gap={8}>
                    <Text variant="help">
                      Because this Bean includes a Work Origin, confirm that no
                      employer secrets, client names, or confidential details are
                      included before sharing publicly.
                    </Text>
                    <Checkbox
                      label="I removed any private or confidential work details"
                      checked={redactionConfirmed}
                      onCheckedChange={(checked) =>
                        setRedactionConfirmed(checked === true)
                      }
                    />
                  </Stack>
                </Notice>
              ) : null}
            </Stack>

            <Inline justify="between" align="center" gap={12}>
              <Button
                emphasis="quiet"
                disabled={submitting}
                onClick={() => setStage(1)}
              >
                ← Back to Spark
              </Button>
              <Button
                emphasis="filled"
                tone="brand"
                pending={submitting}
                pendingLabel="Confirming…"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {editingBean ? "Confirm & Save Revision" : "Confirm & Save Bean"}
              </Button>
            </Inline>
          </Stack>
        )}
      </Stack>
    </Sheet>
  );
}
