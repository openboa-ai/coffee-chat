"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Divider } from "@openboa/yogurt/divider";
import { EmptyResult } from "@openboa/yogurt/empty-result";
import { FilterBar } from "@openboa/yogurt/filter-bar";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Pagination } from "@openboa/yogurt/pagination";
import { Stack } from "@openboa/yogurt/stack";
import { Text } from "@openboa/yogurt/text";
import { PageHeader } from "@openboa/yogurt/top";
import type { PublicSourceSummary } from "@coffee-chat/core";

export interface SourcesDirectoryClientProps {
  sources: PublicSourceSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  initialQuery: string;
  initialTag: string;
  signedIn: boolean;
}

function formatHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourcesDirectoryClient({
  sources,
  totalCount,
  page,
  pageSize,
  initialQuery,
  initialTag,
  signedIn,
}: SourcesDirectoryClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const navigate = (nextQ: string, nextTag: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextTag.trim()) params.set("tag", nextTag.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/sources?${qs}` : "/sources");
  };

  return (
    <Stack gap={24}>
      <PageHeader
        title="Tables"
        detail="Same source, different Taste — sit down to compare how people read the same link"
        action={
          <Inline gap={8}>
            <Button
              emphasis="filled"
              tone="brand"
              size="compact"
              onClick={() =>
                router.push(
                  signedIn
                    ? "/me?compose=1"
                    : "/signin?returnTo=%2Fme%3Fcompose%3D1",
                )
              }
            >
              Start a Table
            </Button>
          </Inline>
        }
      />

      {/* Clean inline filter bar — no outer Card box wrapper */}
      <FilterBar
        label="Search Tables"
        placeholder="Search article title, URL, @voice, or domain…"
        query={query}
        onQueryChange={setQuery}
      >
        <Button
          emphasis="soft"
          size="compact"
          onClick={() => navigate(query, initialTag, 1)}
        >
          Search
        </Button>
        {initialQuery || initialTag ? (
          <Button
            emphasis="quiet"
            size="compact"
            onClick={() => {
              setQuery("");
              navigate("", "", 1);
            }}
          >
            Clear
          </Button>
        ) : null}
      </FilterBar>

      {sources.length === 0 ? (
        <EmptyResult
          query={initialQuery || initialTag || undefined}
          onClear={
            initialQuery || initialTag
              ? () => {
                  setQuery("");
                  navigate("", "", 1);
                }
              : undefined
          }
          empty="No public Tables yet. Roast a Reading Origin Bean and put it On the Table to start the first one."
        />
      ) : (
        <div className="split-grid">
          {sources.map((src) => (
            <Card key={src.originId} variant="raised" density="regular">
              <Stack gap={12}>
                <Inline justify="between" align="center" gap={8}>
                  <Text variant="meta">{formatHost(src.normalizedUrl)}</Text>
                  <Badge tone="brand" dot={false}>
                    {src.publicBeanCount}{" "}
                    {src.publicBeanCount === 1 ? "Bean" : "Beans"}
                  </Badge>
                </Inline>

                <Heading level={3}>
                  {src.sourceTitle ?? src.normalizedUrl}
                </Heading>

                <Text variant="help">
                  Voices at the Table:{" "}
                  {src.authorHandles.map((h) => `@${h}`).join(", ")}
                </Text>

                {src.tags.length > 0 ? (
                  <Inline gap={6} align="center" wrap>
                    {src.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} tone="neutral" dot={false}>
                        #{tag}
                      </Badge>
                    ))}
                  </Inline>
                ) : null}

                <Divider />

                <Inline justify="between" align="center" gap={8}>
                  <Text variant="meta">
                    {src.authorHandles.length}{" "}
                    {src.authorHandles.length === 1 ? "voice" : "voices"}
                  </Text>
                  <Link href={`/sources/${src.originId}`}>
                    Pull up a chair →
                  </Link>
                </Inline>
              </Stack>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <Pagination
          label="Tables pages"
          page={page}
          pages={totalPages}
          onPageChange={(nextPage) => navigate(query, initialTag, nextPage)}
        />
      ) : null}
    </Stack>
  );
}
