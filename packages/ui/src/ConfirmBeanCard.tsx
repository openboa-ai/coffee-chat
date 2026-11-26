"use client";

import { useState } from "react";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Checkbox } from "@openboa/yogurt/checkbox";
import { DisclosureRow } from "@openboa/yogurt/disclosure-row";
import { Divider } from "@openboa/yogurt/divider";
import { Inline } from "@openboa/yogurt/inline";
import { Notice } from "@openboa/yogurt/notice";
import { Stack } from "@openboa/yogurt/stack";
import { Surface } from "@openboa/yogurt/surface";
import { Switch } from "@openboa/yogurt/switch";
import { Text } from "@openboa/yogurt/text";
import { TextField } from "@openboa/yogurt/text-field";
import { Textarea } from "@openboa/yogurt/textarea";
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
      <Card
        title={title}
        description="Confirmed Bean saved to My Roastery · ready to Brew in your AI"
        headerAction={
          <Inline gap={8}>
            <Badge tone="success">Confirmed</Badge>
            <Badge
              tone={savedReceipt.visibility === "public" ? "brand" : "neutral"}
              dot={false}
            >
              {savedReceipt.visibility === "public"
                ? "On the Table"
                : "Private"}
            </Badge>
          </Inline>
        }
        variant="raised"
        density="regular"
      >
        <Text variant="meta">
          Revision {savedReceipt.version} · ID {savedReceipt.beanId}
        </Text>
      </Card>
    );
  }

  return (
    <Card
      title="Roast a Bean"
      description="Capture & confirm a take — nothing is saved until you confirm"
      headerAction={
        <Badge
          tone={visibility === "public" ? "brand" : "neutral"}
          dot={false}
        >
          {visibility === "public"
            ? "On the Table · Public"
            : "Private · Default"}
        </Badge>
      }
      variant="raised"
      density="regular"
    >
      <Stack gap={16}>
        {error ? (
          <Notice title="Could not save Bean" tone="danger">
            {error}
          </Notice>
        ) : null}

        <Stack gap={12}>
          <TextField
            label="Headline"
            help="One-line summary of your Bean"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="One-line summary of your take"
          />
          <Textarea
            label="My Take"
            help="What clicked for you"
            value={take}
            onChange={(e) => setTake(e.target.value)}
            rows={3}
          />
          <Textarea
            label="Trade-off"
            help="What mattered more when making this call"
            value={tradeoff}
            onChange={(e) => setTradeoff(e.target.value)}
            rows={2}
          />
          <Textarea
            label="Boundary"
            help="When it doesn't apply"
            value={boundary}
            onChange={(e) => setBoundary(e.target.value)}
            rows={2}
          />
        </Stack>

        <DisclosureRow label="Domains & Open Question (optional)">
          <Stack gap={12}>
            <TextField
              label="Domains"
              help="Decision topics, comma separated"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="product, architecture, hiring"
            />
            <TextField
              label="Open Question"
              help="What's still uncertain (optional)"
              value={uncertainty}
              onChange={(e) => setUncertainty(e.target.value)}
              placeholder="Optional caveat or open question"
            />
          </Stack>
        </DisclosureRow>

        <Stack gap={8}>
          <Text variant="meta">Origins · Where this came from</Text>
          {payload.origins.map((origin, idx) => (
            <Surface key={idx} variant="surface" density="compact">
              <Stack gap={4}>
                <Inline gap={8} align="center">
                  <Badge tone="neutral" dot={false}>
                    {origin.kind === "source_excerpt"
                      ? "Reading Origin · From reading"
                      : "Work Origin · From work"}
                  </Badge>
                  {origin.locator ? (
                    <Text variant="meta">{origin.locator}</Text>
                  ) : null}
                </Inline>
                {origin.kind === "source_excerpt" ? (
                  <>
                    <Text variant="body">{origin.sourceTitle ?? origin.url}</Text>
                    {origin.quotation ? (
                      <blockquote className="cc-quote">
                        <Text variant="help">&ldquo;{origin.quotation}&rdquo;</Text>
                      </blockquote>
                    ) : null}
                  </>
                ) : (
                  <Text variant="body">{origin.episodeSummary}</Text>
                )}
              </Stack>
            </Surface>
          ))}
        </Stack>

        <Divider />

        <Stack gap={12}>
          <Switch
            label="Put on the Table (Shared publicly)"
            help="Starts Private (only me & my AI). You can switch anytime."
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
                  Confirm this Work Origin contains no private employer, client,
                  or confidential details before putting it On the Table.
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
    </Card>
  );
}
