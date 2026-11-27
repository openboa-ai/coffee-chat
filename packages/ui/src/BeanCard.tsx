"use client";

import type { ReactNode } from "react";
import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Card } from "@openboa/yogurt/card";
import { Divider } from "@openboa/yogurt/divider";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Stack } from "@openboa/yogurt/stack";
import { Text } from "@openboa/yogurt/text";
import type { UiBeanDetail, UiRelationKind } from "./types.js";

export function formatRelationHumanLabel(
  kind: UiRelationKind,
  direction?: "outgoing" | "incoming",
): string {
  if (kind === "supersedes") {
    return direction === "incoming"
      ? "Updated Mind · Replaced by"
      : "Updated Mind · Replaces";
  }
  if (kind === "refines") {
    return direction === "incoming"
      ? "Refined · Built on by"
      : "Refined · Builds on";
  }
  return "In Tension · Conflicts with";
}

export interface BeanCardProps {
  bean: UiBeanDetail;
  actions?: ReactNode;
  showOwner?: boolean;
  showVisibilityBadge?: boolean;
}

export function BeanCard({
  bean,
  actions,
  showOwner = true,
  showVisibilityBadge = true,
}: BeanCardProps) {
  const firstSource = bean.origins.find((o) => o.kind === "source_excerpt");
  const firstWork = bean.origins.find((o) => o.kind === "work_episode");
  const isSuperseded = Boolean(bean.supersededByBeanId);

  return (
    <Card
      variant="raised"
      density="regular"
      className={isSuperseded ? "cc-bean-card cc-bean-superseded" : "cc-bean-card"}
    >
      <Stack gap={16}>
        <Inline justify="between" align="center" gap={12}>
          {showOwner ? (
            <Inline gap={8} align="center">
              <Avatar label={bean.ownerDisplayName} size="compact" />
              <Link
                href={`/@${bean.ownerHandle}`}
                className="person-inline-link"
              >
                <Text variant="body">{bean.ownerDisplayName}</Text>
                <Text variant="meta">@{bean.ownerHandle}</Text>
              </Link>
            </Inline>
          ) : (
            <Inline gap={8} align="center">
              {showVisibilityBadge ? (
                <Badge
                  tone={bean.visibility === "public" ? "brand" : "neutral"}
                  dot={false}
                >
                  {bean.visibility === "public" ? "On the Table" : "Private"}
                </Badge>
              ) : null}
              <Text variant="meta">
                {firstSource && firstWork
                  ? "Reading & Work"
                  : firstSource
                    ? "From reading"
                    : "From work"}
              </Text>
            </Inline>
          )}

          <Inline gap={6} align="center">
            {bean.supersededByBeanId ? (
              <Badge tone="warning">Updated Mind</Badge>
            ) : null}
            {bean.hasTension ? (
              <Badge tone="warning">In Tension</Badge>
            ) : null}
          </Inline>
        </Inline>

        <Stack gap={8}>
          <Heading level={3}>{bean.title}</Heading>
          <Text as="p" variant="body" className="editorial-lead">
            {bean.take}
          </Text>
        </Stack>

        {firstSource?.quotation ? (
          <blockquote className="cc-quote">
            <Stack gap={4}>
              <Text variant="help">&ldquo;{firstSource.quotation}&rdquo;</Text>
              {firstSource.sourceTitle ? (
                <Text variant="meta">
                  {firstSource.sourceTitle}
                  {firstSource.locator ? ` · ${firstSource.locator}` : ""}
                </Text>
              ) : null}
            </Stack>
          </blockquote>
        ) : null}

        <div className="cc-criteria-grid">
          <Stack gap={4} className="cc-criteria-col cc-criteria-priority">
            <Text variant="meta" className="cc-criteria-label">
              What mattered more
            </Text>
            <Text as="p" variant="body">
              {bean.tradeoff}
            </Text>
          </Stack>
          <Stack gap={4} className="cc-criteria-col cc-criteria-boundary">
            <Text variant="meta" className="cc-criteria-label">
              Except when
            </Text>
            <Text as="p" variant="help">
              {bean.boundary}
            </Text>
          </Stack>
        </div>

        {firstWork?.episodeSummary ? (
          <Text variant="meta">Sparked at work: {firstWork.episodeSummary}</Text>
        ) : null}

        {bean.relations.length > 0 || bean.tags.length > 0 ? (
          <Inline gap={6} align="center" wrap>
            {bean.relations.map((rel, idx) => (
              <Badge
                key={rel.id ?? idx}
                tone={
                  rel.kind === "tensions_with"
                    ? "warning"
                    : rel.kind === "supersedes" && rel.direction === "incoming"
                      ? "neutral"
                      : "accent"
                }
                dot={false}
              >
                {formatRelationHumanLabel(rel.kind, rel.direction)}:{" "}
                {rel.relatedBeanTitle || rel.relatedBeanId}
              </Badge>
            ))}
            {bean.tags.map((tag) => (
              <Badge key={tag} tone="neutral" dot={false}>
                #{tag}
              </Badge>
            ))}
          </Inline>
        ) : null}

        {actions ? (
          <>
            <Divider />
            <Inline gap={8} align="center" wrap>
              {actions}
            </Inline>
          </>
        ) : null}
      </Stack>
    </Card>
  );
}
