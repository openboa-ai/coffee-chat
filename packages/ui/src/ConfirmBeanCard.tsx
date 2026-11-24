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
              {savedReceipt.visibility === "public" ? "Public" : "Private"}
            </Badge>
          </Inline>
          <Heading level={3}>{title}</Heading>
          <Text variant="help">
            Your AI can now reference this take automatically when it fits.{" "}
            <span className="cc-mono">{savedReceipt.beanId}</span>
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
              <Badge tone="brand">Save Perspective</Badge>
              <Badge tone={visibility === "public" ? "accent" : "neutral"}>
                {visibility === "public" ? "Public" : "Private (default)"}
              </Badge>
            </Inline>
            <Heading level={3}>Review and confirm this perspective</Heading>
          </Stack>
        </div>

        <Text variant="help">
          Edit anything below so it sounds exactly like you. Nothing is saved until you click
          confirm.
        </Text>

        {error ? (
          <Notice title="Could not save" tone="danger">
            {error}
          </Notice>
        ) : null}

        <Stack gap={12}>
          <TextField
            label="Headline"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="One-line summary of your take"
          />
          <Textarea
            label="What it meant to you"
            value={take}
            onChange={(e) => setTake(e.target.value)}
            rows={3}
          />
          <Textarea
            label="What mattered more (the trade-off)"
            value={tradeoff}
            onChange={(e) => setTradeoff(e.target.value)}
            rows={2}
          />
          <Textarea
            label="When it doesn't apply (the exception)"
            value={boundary}
            onChange={(e) => setBoundary(e.target.value)}
            rows={2}
          />
        </Stack>

        <Disclosure label="Optional tags & open questions">
          <Stack gap={12}>
            <TextField
              label="Tags (comma separated)"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="product, architecture, hiring"
            />
            <TextField
              label="What you're still unsure about"
              value={uncertainty}
              onChange={(e) => setUncertainty(e.target.value)}
              placeholder="Optional caveat or open question"
            />
          </Stack>
        </Disclosure>

        <Stack gap={8}>
          <Text variant="meta">Where this came from</Text>
          {payload.origins.map((origin, idx) => (
            <div key={idx} className="cc-muted-box">
              <Stack gap={4}>
                <Inline gap={8}>
                  <Badge tone="neutral">
                    {origin.kind === "source_excerpt" ? "From a read" : "From work"}
                  </Badge>
                  {origin.locator ? <Text variant="meta">{origin.locator}</Text> : null}
                </Inline>
                {origin.kind === "source_excerpt" ? (
                  <>
                    <Text variant="body">{origin.sourceTitle ?? origin.url}</Text>
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
            label="Share publicly on my Coffee Chat page"
            help="Starts private (only you and your AI). You can change this anytime."
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
                  Because this take came from a work decision, make sure no company secrets, private
                  code, or confidential names are included.
                </Text>
                <Checkbox
                  label="I removed any private or confidential work details"
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
            pendingLabel="Saving…"
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
