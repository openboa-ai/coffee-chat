"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Disclosure,
  Divider,
  Heading,
  Inline,
  Notice,
  SegmentedControl,
  Select,
  Stack,
  Surface,
  Switch,
  Text,
  TextField,
  Textarea,
} from "@openboa/yogurt";
import type {
  UiBeanDetail,
  UiPreparedBeanData,
  UiRelationKind,
  UiVisibility,
} from "@coffee-chat/ui";

const TRADEOFF_STARTERS = [
  "Learning speed over upfront polish",
  "Reliability and clarity over feature breadth",
  "Explicit failure over silent convenience",
  "Simple single deploy over premature splitting",
];

export interface QuickCaptureFormProps {
  defaultUrl?: string;
  defaultSourceTitle?: string;
  editingBean?: UiBeanDetail | null;
  existingOwnBeans?: Array<{ id: string; title: string }>;
  onSaved: (bean: UiBeanDetail) => void;
  onCancel?: () => void;
}

export function QuickCaptureForm({
  defaultUrl,
  defaultSourceTitle,
  editingBean = null,
  existingOwnBeans = [],
  onSaved,
  onCancel,
}: QuickCaptureFormProps) {
  const initialSource = editingBean?.origins.find(
    (o) => o.kind === "source_excerpt",
  );
  const initialWork = editingBean?.origins.find(
    (o) => o.kind === "work_episode",
  );

  const [originKind, setOriginKind] = useState<"source_excerpt" | "work_episode">(
    editingBean
      ? initialSource
        ? "source_excerpt"
        : "work_episode"
      : defaultUrl
        ? "source_excerpt"
        : "source_excerpt",
  );
  const [title, setTitle] = useState(editingBean?.title ?? "");
  const [take, setTake] = useState(editingBean?.take ?? "");
  const [tradeoff, setTradeoff] = useState(editingBean?.tradeoff ?? "");
  const [boundary, setBoundary] = useState(editingBean?.boundary ?? "");
  const [url, setUrl] = useState(initialSource?.url ?? defaultUrl ?? "");
  const [sourceTitle, setSourceTitle] = useState(
    initialSource?.sourceTitle ?? defaultSourceTitle ?? "",
  );
  const [quotation, setQuotation] = useState(initialSource?.quotation ?? "");
  const [episodeSummary, setEpisodeSummary] = useState(
    initialWork?.episodeSummary ?? "",
  );
  const [tagsText, setTagsText] = useState(
    editingBean?.tags.join(", ") ?? "",
  );
  const [uncertainty, setUncertainty] = useState(
    editingBean?.uncertainty ?? "",
  );
  const [relationTargetId, setRelationTargetId] = useState("");
  const [relationKind, setRelationKind] = useState<UiRelationKind>("supersedes");
  const [visibility, setVisibility] = useState<UiVisibility>(
    editingBean?.visibility ?? "private",
  );
  const [redactionConfirmed, setRedactionConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsRedaction =
    visibility === "public" && originKind === "work_episode";

  const canSave =
    !saving &&
    title.trim().length > 0 &&
    take.trim().length > 0 &&
    tradeoff.trim().length > 0 &&
    boundary.trim().length > 0 &&
    (originKind === "source_excerpt"
      ? url.trim().length > 0
      : episodeSummary.trim().length > 0) &&
    (!needsRedaction || redactionConfirmed);

  const linkableBeans = existingOwnBeans.filter(
    (b) => b.id !== editingBean?.id,
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const origins =
        originKind === "source_excerpt"
          ? [
              {
                kind: "source_excerpt" as const,
                url: url.trim(),
                sourceTitle: sourceTitle.trim() || null,
                quotation: quotation.trim() || null,
              },
            ]
          : [
              {
                kind: "work_episode" as const,
                episodeSummary: episodeSummary.trim(),
              },
            ];

      const relations = relationTargetId
        ? [{ toBeanId: relationTargetId, kind: relationKind }]
        : [];

      // Step 1: Server normalizes & computes exact RFC 8785 JCS SHA-256 digest.
      const prepRes = await fetch("/api/beans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "prepare",
          input: {
            beanId: editingBean?.id ?? null,
            expectedVersion: editingBean?.version ?? null,
            title: title.trim(),
            take: take.trim(),
            tradeoff: tradeoff.trim(),
            boundary: boundary.trim(),
            uncertainty: uncertainty.trim() || null,
            tags,
            visibility,
            origins,
            relations,
          },
        }),
      });

      const prepData = (await prepRes.json()) as {
        prepared?: UiPreparedBeanData;
        message?: string;
      };
      if (!prepRes.ok || !prepData.prepared) {
        throw new Error(prepData.message ?? "Could not validate your take.");
      }

      // Step 2: Atomic owner-confirmed persistence with exact digest + idempotency key.
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
        bean?: UiBeanDetail;
        message?: string;
      };
      if (!saveRes.ok || !saveData.bean) {
        throw new Error(saveData.message ?? "Could not save your take.");
      }

      onSaved(saveData.bean);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your take.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface className="cc-card">
      <Stack gap={16}>
        <div className="cc-row-between">
          <Stack gap={4}>
            <Heading level={3}>
              {editingBean ? "Update your perspective" : "Capture a perspective"}
            </Heading>
            <Text variant="help">
              Record what stood out, what trade-off you chose, and when it doesn&apos;t apply.
            </Text>
          </Stack>
          <Badge tone={visibility === "public" ? "brand" : "neutral"}>
            {visibility === "public" ? "Public" : "Private (default)"}
          </Badge>
        </div>

        {error ? (
          <Notice title="Could not save" tone="danger">
            {error}
          </Notice>
        ) : null}

        {!defaultUrl ? (
          <SegmentedControl
            label="Where did this thought come from?"
            value={originKind}
            onValueChange={(v) => {
              setOriginKind(v as "source_excerpt" | "work_episode");
              setRedactionConfirmed(false);
            }}
            options={[
              { id: "source_excerpt", label: "Something I read" },
              { id: "work_episode", label: "A call I made at work" },
            ]}
          />
        ) : null}

        {originKind === "source_excerpt" ? (
          <Stack gap={12}>
            <TextField
              label="Article or link URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/essay"
              disabled={Boolean(defaultUrl)}
            />
            <TextField
              label="Line that stood out (optional quote)"
              value={quotation}
              onChange={(e) => setQuotation(e.target.value)}
              placeholder="Paste the specific sentence you reacted to"
            />
          </Stack>
        ) : (
          <Textarea
            label="What situation sparked this? (keep it free of secrets or private code)"
            value={episodeSummary}
            onChange={(e) => setEpisodeSummary(e.target.value)}
            placeholder="e.g. Corrected an AI refactor that silently swallowed auth errors."
            rows={2}
          />
        )}

        <TextField
          label="Headline — your take in one line"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Ship a small reversible probe before polishing v1"
        />

        <Textarea
          label="What it meant to you"
          value={take}
          onChange={(e) => setTake(e.target.value)}
          placeholder="Why did this resonate or bother you?"
          rows={2}
        />

        <Stack gap={8}>
          <Textarea
            label="What mattered more (the trade-off)"
            value={tradeoff}
            onChange={(e) => setTradeoff(e.target.value)}
            placeholder="What are you optimizing for, and what are you willing to trade away?"
            rows={2}
          />
          <div className="cc-chip-row">
            {TRADEOFF_STARTERS.map((starter) => (
              <Button
                key={starter}
                emphasis="quiet"
                size="compact"
                type="button"
                onClick={() => setTradeoff(starter)}
              >
                + {starter}
              </Button>
            ))}
          </div>
        </Stack>

        <Textarea
          label="When it doesn't apply (the exception)"
          value={boundary}
          onChange={(e) => setBoundary(e.target.value)}
          placeholder="e.g. Never apply to irreversible schema migrations or security boundaries."
          rows={2}
        />

        <Disclosure label="Optional: tags, title, or connect to an earlier take">
          <Stack gap={12}>
            {originKind === "source_excerpt" ? (
              <TextField
                label="Source title (optional)"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="Readable title of the essay or post"
              />
            ) : null}
            <TextField
              label="Tags (comma separated)"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="product, architecture, hiring"
            />
            <TextField
              label="Still unsure about (optional)"
              value={uncertainty}
              onChange={(e) => setUncertainty(e.target.value)}
              placeholder="Any caveat or open question"
            />
            {linkableBeans.length > 0 ? (
              <Stack gap={8}>
                <Select
                  label="Connect to an earlier take"
                  value={relationTargetId}
                  onChange={(e) => setRelationTargetId(e.target.value)}
                  placeholder="None"
                  options={linkableBeans.map((b) => ({
                    id: b.id,
                    label: b.title,
                  }))}
                />
                {relationTargetId ? (
                  <SegmentedControl
                    label="How does this relate?"
                    value={relationKind}
                    onValueChange={(v) => setRelationKind(v as UiRelationKind)}
                    options={[
                      { id: "supersedes", label: "Updated my mind" },
                      { id: "refines", label: "Builds on it" },
                      { id: "tensions_with", label: "In tension" },
                    ]}
                  />
                ) : null}
              </Stack>
            ) : null}
          </Stack>
        </Disclosure>

        <Divider />

        <Stack gap={12}>
          <Switch
            label="Share publicly on my Coffee Chat page"
            help="Private by default (only you and your connected AI can see it). You can switch anytime."
            checked={visibility === "public"}
            onCheckedChange={(checked) => {
              setVisibility(checked ? "public" : "private");
              if (!checked) setRedactionConfirmed(false);
            }}
          />

          {needsRedaction ? (
            <Notice title="Quick privacy check before sharing" tone="warning">
              <Stack gap={8}>
                <Text variant="help">
                  This take came from a work decision. Confirm no private code, company secrets, or
                  confidential names remain before publishing.
                </Text>
                <Checkbox
                  label="I removed any private or confidential work details"
                  checked={redactionConfirmed}
                  onCheckedChange={(v) => setRedactionConfirmed(v === true)}
                />
              </Stack>
            </Notice>
          ) : null}
        </Stack>

        <Inline gap={12}>
          <Button
            emphasis="filled"
            tone="brand"
            disabled={!canSave}
            pending={saving}
            pendingLabel="Saving…"
            onClick={handleSave}
          >
            {editingBean ? "Save Updated Take" : "Save Perspective"}
          </Button>
          {onCancel ? (
            <Button emphasis="quiet" disabled={saving} onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </Inline>
      </Stack>
    </Surface>
  );
}
