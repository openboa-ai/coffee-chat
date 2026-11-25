"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { EmptyResult } from "@openboa/yogurt/empty-result";
import { FilterBar } from "@openboa/yogurt/filter-bar";
import { Inline } from "@openboa/yogurt/inline";
import { List } from "@openboa/yogurt/list";
import { ListRow } from "@openboa/yogurt/list-row";
import { Pagination } from "@openboa/yogurt/pagination";
import { Stack } from "@openboa/yogurt/stack";
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
        detail="Compare takes on a source — every Table gathers public Beans around one shared link"
        action={
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
        }
      />

      <Card variant="raised" density="compact">
        <FilterBar
          label="Search Tables"
          placeholder="Search source title, URL, @voice, or domain…"
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
      </Card>

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
        <Card variant="raised" density="compact">
          <List label="Shared Tables" divided>
            {sources.map((src) => (
              <ListRow
                key={src.originId}
                title={src.sourceTitle ?? src.normalizedUrl}
                description={`${src.normalizedUrl} · Voices: ${src.authorHandles.map((h) => `@${h}`).join(", ")}`}
                href={`/sources/${src.originId}`}
                inlineMeta={
                  <Inline gap={4} align="center">
                    <Badge tone="brand" dot={false}>
                      {src.publicBeanCount}{" "}
                      {src.publicBeanCount === 1 ? "Bean" : "Beans"}
                    </Badge>
                    {src.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} tone="neutral" dot={false}>
                        #{tag}
                      </Badge>
                    ))}
                  </Inline>
                }
              />
            ))}
          </List>
        </Card>
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
