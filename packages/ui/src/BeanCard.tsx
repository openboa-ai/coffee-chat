"use client";

import type { ReactNode } from "react";
import {
  Avatar,
  Badge,
  Divider,
  Heading,
  Inline,
  Link,
  Post,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
import type { UiBeanDetail, UiRelationKind } from "./types.js";

export function formatRelationHumanLabel(
  kind: UiRelationKind,
  direction?: "outgoing" | "incoming",
): string {
  if (kind === "supersedes") {
    return direction === "incoming" ? "Updated later by" : "Updates earlier take";
  }
  if (kind === "refines") {
    return direction === "incoming" ? "Expanded by" : "Builds on";
  }
  return "In tension with";
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

  return (
    <Post>
      <Surface className="cc-card">
        <Stack gap={16}>
          <div className="cc-row-between">
            {showOwner ? (
              <Inline gap={8}>
                <Avatar label={bean.ownerDisplayName} size={28} />
                <Stack gap={2}>
                  <Link href={`/@${bean.ownerHandle}`}>
                    <strong>{bean.ownerDisplayName}</strong>
                  </Link>
                  <Text variant="meta">@{bean.ownerHandle}</Text>
                </Stack>
              </Inline>
            ) : (
              <Inline gap={8}>
                {showVisibilityBadge ? (
                  <Badge tone={bean.visibility === "public" ? "brand" : "neutral"}>
                    {bean.visibility === "public" ? "Public" : "Private"}
                  </Badge>
                ) : null}
                <Badge tone="neutral">
                  {firstSource ? "From a read" : "From work"}
                </Badge>
              </Inline>
            )}

            <Inline gap={8}>
              {showOwner && showVisibilityBadge ? (
                <Badge tone={bean.visibility === "public" ? "brand" : "neutral"}>
                  {bean.visibility === "public" ? "Public" : "Private"}
                </Badge>
              ) : null}
              {bean.supersededByBeanId ? (
                <Badge tone="warning">Updated later</Badge>
              ) : null}
              {bean.hasTension ? (
                <Badge tone="warning">Has tension</Badge>
              ) : null}
            </Inline>
          </div>

          <Stack gap={8}>
            <Heading level={3}>{bean.title}</Heading>
            <p className="cc-paragraph">
              <Text variant="body">{bean.take}</Text>
            </p>
          </Stack>

          {firstSource?.quotation ? (
            <blockquote className="cc-quote">
              &ldquo;{firstSource.quotation}&rdquo;
              {firstSource.sourceTitle ? (
                <div>
                  <Text variant="meta">
                    — {firstSource.sourceTitle}
                    {firstSource.locator ? ` · ${firstSource.locator}` : ""}
                  </Text>
                </div>
              ) : null}
            </blockquote>
          ) : null}

          <div className="cc-tradeoff-box">
            <Stack gap={4}>
              <Text variant="meta">What mattered more</Text>
              <Text variant="body">
                <strong>{bean.tradeoff}</strong>
              </Text>
            </Stack>
          </div>

          <div className="cc-boundary-box">
            <Stack gap={4}>
              <Text variant="meta">When it doesn&apos;t apply</Text>
              <Text variant="help">{bean.boundary}</Text>
            </Stack>
          </div>

          {firstWork?.episodeSummary ? (
            <Text variant="meta">Context: {firstWork.episodeSummary}</Text>
          ) : null}

          {firstSource && !firstSource.quotation && firstSource.url ? (
            <Text variant="meta">
              Read: {firstSource.sourceTitle ?? firstSource.url}
            </Text>
          ) : null}

          {bean.relations.length > 0 ? (
            <div className="cc-chip-row">
              {bean.relations.map((rel, idx) => (
                <Badge
                  key={rel.id ?? idx}
                  tone={rel.kind === "tensions_with" ? "warning" : "accent"}
                >
                  {formatRelationHumanLabel(rel.kind, rel.direction)}:{" "}
                  {rel.relatedBeanTitle || rel.relatedBeanId}
                </Badge>
              ))}
            </div>
          ) : null}

          {bean.tags.length > 0 ? (
            <div className="cc-chip-row">
              {bean.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  #{tag}
                </Badge>
              ))}
            </div>
          ) : null}

          {actions ? (
            <>
              <Divider />
              <Inline gap={8}>{actions}</Inline>
            </>
          ) : null}
        </Stack>
      </Surface>
    </Post>
  );
}
