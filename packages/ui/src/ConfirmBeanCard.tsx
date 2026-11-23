"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Divider,
  Heading,
  Inline,
  Notice,
  Stack,
  Surface,
  Switch,
  Text,
  TextField,
  Textarea,
} from "@openboa/yogurt";
import type { UiPreparedBeanData, UiVisibility } from "./types.js";

export interface ConfirmBeanEdits {
  title: string;
  take: string;
  tradeoff: string;
  boundary: string;
  uncertainty: string;
  tagsText: string;
  visibility: UiVisibility;
  redactionConfirmed: boolean;
}

export interface ConfirmBeanCardProps {
  prepared: UiPreparedBeanData;
  saving?: boolean;
  savedReceipt?: { beanId: string; version: number; visibility: UiVisibility } | null;
  error?: string | null;
  onConfirm: (edits: ConfirmBeanEdits) => void;
  onCancel?: () => void;
}

export function ConfirmBeanCard({
  prepared,
  saving = false,
  savedReceipt = null,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmBeanCardProps) {
  const payload = prepared.canonicalPayload;
  const [title, setTitle] = useState(payload.title);
  const [take, setTake] = useState(payload.take);
  const [tradeoff, setTradeoff] = useState(payload.tradeoff);
  const [boundary, setBoundary] = useState(payload.boundary);
  const [uncertainty, setUncertainty] = useState(payload.uncertainty ?? "");
  const [tagsText, setTagsText] = useState(payload.tags.join(", "));
  const [visibility, setVisibility] = useState<UiVisibility>(payload.visibility);
  const [redactionConfirmed, setRedactionConfirmed] = useState(false);

  const hasWorkEpisode = payload.origins.some((o) => o.kind === "work_episode");
  const needsRedaction = visibility === "public" && hasWorkEpisode;
  const canSubmit =
    !saving &&
    title.trim().length > 0 &&
    take.trim().length > 0 &&
    tradeoff.trim().length > 0 &&
    boundary.trim().length > 0 &&
    (!needsRedaction || redactionConfirmed);

  if (savedReceipt) {
    return (
      <Surface className="cc-card">
        <Stack gap={12}>
          <Inline gap={8}>
            <Badge tone="success">Confirmed &amp; Saved</Badge>
            <Badge tone={savedReceipt.visibility === "public" ? "brand" : "neutral"}>
              {savedReceipt.visibility}
            </Badge>
            <Text variant="meta">v{savedReceipt.version}</Text>
          </Inline>
          <Heading level={3}>{title}</Heading>
          <Text variant="help">
            Bean ID: <span className="cc-mono">{savedReceipt.beanId}</span>
          </Text>
        </Stack>
      </Surface>
    );
  }

  return (
    <Surface className="cc-card">
      <Stack gap={16}>
        <div className="cc-row-between">
          <Stack gap={4}>
            <Inline gap={8}>
              <Badge tone="brand">Roast Confirmation</Badge>
              <Badge tone={visibility === "public" ? "accent" : "neutral"}>
                {visibility === "public" ? "Public" : "Private (default)"}
              </Badge>
            </Inline>
            <Heading level={3}>Review and confirm this perspective</Heading>
          </Stack>
          <Text variant="meta">Digest {prepared.digest.slice(0, 12)}…</Text>
        </div>

        <Text variant="help">
          Nothing is saved until you confirm. Review your interpretation, trade-off, boundary, and
          visibility below.
        </Text>

        {error ? (
          <Notice title="Save failed" tone="danger">
            {error}
          </Notice>
        ) : null}

        <Stack gap={12}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="One-line summary of this perspective"
          />
          <Textarea
            label="Take (what it meant to you)"
            value={take}
            onChange={(e) => setTake(e.target.value)}
            rows={3}
          />
          <Textarea
            label="Priority & trade-off (what mattered more)"
            value={tradeoff}
            onChange={(e) => setTradeoff(e.target.value)}
            rows={2}
          />
          <Textarea
            label="Boundary (when NOT to apply)"
            value={boundary}
            onChange={(e) => setBoundary(e.target.value)}
            rows={2}
          />
          <TextField
            label="Uncertainty (optional)"
            value={uncertainty}
            onChange={(e) => setUncertainty(e.target.value)}
            placeholder="Open questions or low-confidence conditions"
          />
          <TextField
            label="Tags (comma separated)"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="architecture, product, review"
          />
        </Stack>

        <Divider />

        <Stack gap={8}>
          <Text variant="meta">Origins ({payload.origins.length})</Text>
          {payload.origins.map((origin, idx) => (
            <div key={idx} className="cc-muted-box">
              <Stack gap={4}>
                <Inline gap={8}>
                  <Badge tone="neutral">
                    {origin.kind === "source_excerpt" ? "Source Excerpt" : "Work Episode"}
                  </Badge>
                  {origin.locator ? <Text variant="meta">{origin.locator}</Text> : null}
                </Inline>
                {origin.kind === "source_excerpt" ? (
                  <>
                    <Text variant="body">{origin.sourceTitle ?? origin.url}</Text>
                    <Text variant="meta">{origin.url}</Text>
                    {origin.quotation ? (
                      <blockquote className="cc-quote">&ldquo;{origin.quotation}&rdquo;</blockquote>
                    ) : null}
                  </>
                ) : (
                  <Text variant="body">{origin.episodeSummary}</Text>
                )}
              </Stack>
            </div>
          ))}
        </Stack>

        <Divider />

        <Stack gap={12}>
          <Switch
            label="Make this Bean public"
            help="Beans start private by default. Public Beans appear on your profile and shared source pages."
            checked={visibility === "public"}
            onCheckedChange={(checked) => {
              setVisibility(checked ? "public" : "private");
              if (!checked) setRedactionConfirmed(false);
            }}
          />

          {needsRedaction ? (
            <Notice title="Work episode redaction check" tone="warning">
              <Stack gap={8}>
                <Text variant="help">
                  This Bean originated from a work episode. Confirm that no proprietary names,
                  private code, credentials, or confidential data remain before making it public.
                </Text>
                <Checkbox
                  label="I verified this summary contains no private or proprietary information"
                  checked={redactionConfirmed}
                  onCheckedChange={(checked) => setRedactionConfirmed(checked === true)}
                />
              </Stack>
            </Notice>
          ) : null}
        </Stack>

        <Inline gap={12}>
          <Button
            emphasis="filled"
            tone="brand"
            disabled={!canSubmit}
            pending={saving}
            pendingLabel="Saving Bean…"
            onClick={() =>
              onConfirm({
                title: title.trim(),
                take: take.trim(),
                tradeoff: tradeoff.trim(),
                boundary: boundary.trim(),
                uncertainty: uncertainty.trim(),
                tagsText,
                visibility,
                redactionConfirmed,
              })
            }
          >
            Confirm &amp; Save Bean
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
