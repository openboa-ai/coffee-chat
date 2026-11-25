"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { EmptyResult } from "@openboa/yogurt/empty-result";
import { FilterBar } from "@openboa/yogurt/filter-bar";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Pagination } from "@openboa/yogurt/pagination";
import { Result } from "@openboa/yogurt/result";
import { Stack } from "@openboa/yogurt/stack";
import { Surface } from "@openboa/yogurt/surface";
import { Text } from "@openboa/yogurt/text";
import { Toast } from "@openboa/yogurt/toast";
import { PageHeader } from "@openboa/yogurt/top";
import { BeanCard } from "@coffee-chat/ui";
import type {
  BeanDetail,
  HydratedShelfRef,
  PublicPersonCard,
} from "@coffee-chat/core";
import { AgentHandoffDialog } from "./AgentHandoffDialog";

export interface FeaturedTableData {
  originId: string;
  normalizedUrl: string;
  sourceTitle: string | null;
  beans: BeanDetail[];
}

export interface HomeClientProps {
  signedIn: boolean;
  totalCorpusPublicCount: number;
  featuredTable: FeaturedTableData | null;
  people: PublicPersonCard[];
  publicBeans: BeanDetail[];
  filteredTotalCount: number;
  page: number;
  pageSize: number;
  initialQuery: string;
  initialTag: string;
  initialShelfRefs: HydratedShelfRef[];
  activeGrantCount?: number;
}

export function HomeClient({
  signedIn,
  totalCorpusPublicCount,
  featuredTable,
  people,
  publicBeans,
  filteredTotalCount,
  page,
  pageSize,
  initialQuery,
  initialTag,
  initialShelfRefs,
  activeGrantCount,
}: HomeClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [beanShelfMap, setBeanShelfMap] = useState<Record<string, string>>(
    () => {
      const map: Record<string, string> = {};
      for (const ref of initialShelfRefs) {
        if (ref.targetType === "bean") map[ref.targetId] = ref.shelfItemId;
      }
      return map;
    },
  );
  const [personShelfMap, setPersonShelfMap] = useState<Record<string, string>>(
    () => {
      const map: Record<string, string> = {};
      for (const ref of initialShelfRefs) {
        if (ref.targetType === "person") map[ref.targetId] = ref.shelfItemId;
      }
      return map;
    },
  );
  const [brewDialog, setBrewDialog] = useState<{
    title: string;
    description: string;
    prompt: string;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const navigate = (nextQ: string, nextTag: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextTag.trim()) params.set("tag", nextTag.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const toggleSaveBean = async (bean: BeanDetail) => {
    if (!signedIn) {
      router.push("/signin?returnTo=/");
      return;
    }
    const existingId = beanShelfMap[bean.id];
    if (existingId) {
      const res = await fetch("/api/shelf", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shelfItemId: existingId }),
      });
      if (res.ok) {
        setBeanShelfMap((prev) => {
          const next = { ...prev };
          delete next[bean.id];
          return next;
        });
        setToastMsg(`Removed "${bean.title}" from your Shelf.`);
      }
      return;
    }
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "bean", beanId: bean.id }),
    });
    const data = (await res.json()) as { item?: { id: string } };
    if (res.ok && data.item?.id) {
      setBeanShelfMap((prev) => ({ ...prev, [bean.id]: data.item!.id }));
      setToastMsg(`Saved "${bean.title}" to your Shelf.`);
    }
  };

  const toggleSavePerson = async (person: PublicPersonCard) => {
    if (!signedIn) {
      router.push("/signin?returnTo=/");
      return;
    }
    const existingId = personShelfMap[person.userId];
    if (existingId) {
      const res = await fetch("/api/shelf", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shelfItemId: existingId }),
      });
      if (res.ok) {
        setPersonShelfMap((prev) => {
          const next = { ...prev };
          delete next[person.userId];
          return next;
        });
        setToastMsg(`Removed @${person.handle} from your Shelf.`);
      }
      return;
    }
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "person", handle: person.handle }),
    });
    const data = (await res.json()) as { item?: { id: string } };
    if (res.ok && data.item?.id) {
      setPersonShelfMap((prev) => ({ ...prev, [person.userId]: data.item!.id }));
      setToastMsg(`Added @${person.handle} to your Shelf.`);
    }
  };

  // Unseeded production onboarding when the database has 0 public Beans
  if (totalCorpusPublicCount === 0 && !initialQuery && !initialTag) {
    return (
      <Stack gap={24}>
        <PageHeader
          title="Coffee Chat"
          detail="Knowledge is shared. What a person makes of it is personal."
          featured
        />

        <Result
          title="Start Coffee Chat · Roast your first Bean"
          action={
            <Inline gap={12}>
              <Button
                emphasis="filled"
                tone="brand"
                onClick={() =>
                  router.push(
                    signedIn
                      ? "/me?compose=1"
                      : "/signin?returnTo=%2Fme%3Fcompose%3D1",
                  )
                }
              >
                Roast a private Bean
              </Button>
              <Button emphasis="soft" onClick={() => router.push("/connect")}>
                Open Brew Setup
              </Button>
            </Inline>
          }
        >
          <Text as="p" variant="body">
            No public Beans are on the Table yet. Start privately in My Roastery,
            connect your AI app to Brew your own judgment criteria, and share
            selected Beans whenever you want to open the first Table.
          </Text>
        </Result>

        <div className="split-grid">
          <Card
            title="1. Roast · Capture & confirm"
            description="Private by default in My Roastery"
            variant="raised"
            density="regular"
          >
            <Text variant="help">
              Save a Reading Origin or Work Origin with your exact Trade-off
              (what mattered more) and Boundary (when it doesn&apos;t apply).
            </Text>
          </Card>
          <Card
            title="2. Brew · Apply in your AI"
            description="Connect Codex, Claude Code, ChatGPT, Antigravity, or Cursor"
            variant="raised"
            density="regular"
          >
            <Text variant="help">
              Let your AI consult your confirmed Beans and Tasting Notes so you
              stop repeating the same corrections.
            </Text>
          </Card>
          <Card
            title="3. Tables · Compare takes"
            description="Share selected Beans publicly on a shared source"
            variant="raised"
            density="regular"
          >
            <Text variant="help">
              Put a Reading Origin Bean On the Table to start the first
              side-by-side comparison.
            </Text>
          </Card>
        </div>
      </Stack>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filteredTotalCount / pageSize));

  return (
    <Stack gap={24}>
      <PageHeader
        title="Explore"
        detail="Fresh Beans & active Tables — compare what mattered more across shared sources"
        action={
          <Inline gap={8}>
            <Button
              emphasis="soft"
              size="compact"
              onClick={() => router.push("/sources")}
            >
              Browse Tables
            </Button>
            <Button
              emphasis="filled"
              tone="neutral"
              size="compact"
              onClick={() =>
                router.push(
                  signedIn
                    ? "/me?compose=1"
                    : "/signin?returnTo=%2Fme%3Fcompose%3D1",
                )
              }
            >
              Roast a Bean
            </Button>
          </Inline>
        }
      />

      {toastMsg ? (
        <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
      ) : null}

      <Card variant="raised" density="compact">
        <FilterBar
          label="Search public Beans"
          placeholder="Search takes, trade-offs, boundaries, or domains…"
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
              Clear filters
            </Button>
          ) : null}
        </FilterBar>
      </Card>

      {featuredTable && !initialQuery && !initialTag && page === 1 ? (
        <Card
          title={`Featured Table · ${featuredTable.sourceTitle ?? featuredTable.normalizedUrl}`}
          description="Same source, contrasting trade-offs — open the Table for full axis-by-axis comparison"
          headerAction={
            <Badge tone="neutral" dot={false}>
              {featuredTable.beans.length}{" "}
              {featuredTable.beans.length === 1 ? "Bean" : "Beans"}
            </Badge>
          }
          action={
            <Inline gap={8}>
              <Button
                emphasis="soft"
                size="compact"
                onClick={() =>
                  router.push(`/sources/${featuredTable.originId}`)
                }
              >
                Open Table →
              </Button>
              <Button
                emphasis="quiet"
                size="compact"
                onClick={() =>
                  setBrewDialog({
                    title: "Brew · Compare this Table in my AI",
                    description:
                      "Bring these contrasting trade-offs into your connected AI",
                    prompt: `Review the Coffee Chat Table for "${featuredTable.sourceTitle ?? featuredTable.normalizedUrl}" (${featuredTable.normalizedUrl}). Compare the differing trade-offs and boundaries shared there, and tell me which criteria fit my current context.`,
                  })
                }
              >
                Brew this Table
              </Button>
            </Inline>
          }
          variant="raised"
          density="regular"
        >
          <div className="split-grid">
            {(() => {
              const seen = new Set<string>();
              const distinct = featuredTable.beans.filter((b) => {
                if (seen.has(b.ownerHandle)) return false;
                seen.add(b.ownerHandle);
                return true;
              });
              const preview =
                distinct.length >= 2
                  ? distinct.slice(0, 2)
                  : featuredTable.beans.slice(0, 2);
              return preview.map((b) => (
                <Surface key={b.id} variant="surface" density="compact">
                  <Stack gap={8}>
                    <Inline justify="between" align="center" gap={8}>
                      <Link href={`/@${b.ownerHandle}`}>
                        {b.ownerDisplayName} (@{b.ownerHandle})
                      </Link>
                    </Inline>
                    <Text variant="body">{b.title}</Text>
                    <Text variant="help">Trade-off: {b.tradeoff}</Text>
                    <Text variant="meta">Boundary: {b.boundary}</Text>
                  </Stack>
                </Surface>
              ));
            })()}
          </div>
        </Card>
      ) : null}

      <Stack gap={16}>
        <Inline justify="between" align="center" gap={8}>
          <Stack gap={2}>
            <Text variant="body">Fresh Beans on the Table</Text>
            <Text variant="meta">
              {filteredTotalCount} public{" "}
              {filteredTotalCount === 1 ? "Bean" : "Beans"}
              {initialTag ? ` in #${initialTag}` : ""}
              {initialQuery ? ` matching "${initialQuery}"` : ""}
            </Text>
          </Stack>
        </Inline>

        {publicBeans.length === 0 ? (
          <EmptyResult
            query={initialQuery || initialTag || undefined}
            onClear={() => {
              setQuery("");
              navigate("", "", 1);
            }}
            empty="No public Beans matched your search."
          />
        ) : (
          <Stack gap={16}>
            {publicBeans.map((bean) => {
              const firstSourceOriginId = bean.origins.find(
                (o) => o.kind === "source_excerpt" && o.originId,
              )?.originId;
              const isSaved = Boolean(beanShelfMap[bean.id]);
              return (
                <BeanCard
                  key={bean.id}
                  bean={bean}
                  actions={
                    <Inline gap={8} align="center">
                      <Button
                        emphasis={isSaved ? "quiet" : "soft"}
                        size="compact"
                        onClick={() => void toggleSaveBean(bean)}
                      >
                        {isSaved ? "On Shelf" : "Save to Shelf"}
                      </Button>
                      <Button
                        emphasis="quiet"
                        size="compact"
                        onClick={() =>
                          setBrewDialog({
                            title: `Brew · Apply @${bean.ownerHandle}'s Bean`,
                            description:
                              "Consult this public trade-off in your AI without impersonation",
                            prompt: `Consult the public Coffee Chat Bean "${bean.title}" by @${bean.ownerHandle}. Consider their trade-off ("${bean.tradeoff}"), respect its boundary ("${bean.boundary}"), and attribute any guidance clearly to their confirmed Bean.`,
                          })
                        }
                      >
                        Brew in my AI
                      </Button>
                      {firstSourceOriginId ? (
                        <Link href={`/sources/${firstSourceOriginId}`}>
                          Open Table →
                        </Link>
                      ) : null}
                    </Inline>
                  }
                />
              );
            })}
          </Stack>
        )}

        {totalPages > 1 ? (
          <Pagination
            label="Explore pages"
            page={page}
            pages={totalPages}
            onPageChange={(nextPage) => navigate(query, initialTag, nextPage)}
          />
        ) : null}
      </Stack>

      {people.length > 0 ? (
        <Stack gap={12}>
          <Stack gap={2}>
            <Text variant="body">Active Voices</Text>
            <Text variant="meta">
              People sharing confirmed Beans — add voices to your Shelf to Brew
              their perspectives
            </Text>
          </Stack>
          <div className="split-grid">
            {people.map((person) => {
              const isSaved = Boolean(personShelfMap[person.userId]);
              return (
                <Card
                  key={person.userId}
                  title={person.displayName}
                  description={`@${person.handle} · ${person.publicCount} public · ${person.privateCount} private`}
                  headerAction={
                    <Avatar label={person.displayName} size="compact" />
                  }
                  action={
                    <Inline gap={8} align="center">
                      <Button
                        emphasis={isSaved ? "quiet" : "soft"}
                        size="compact"
                        onClick={() => void toggleSavePerson(person)}
                      >
                        {isSaved ? "Voice on Shelf" : "Add to Shelf"}
                      </Button>
                      <Link href={`/@${person.handle}`}>Profile →</Link>
                    </Inline>
                  }
                  variant="raised"
                  density="compact"
                >
                  <Stack gap={8}>
                    {person.signatureTradeoff ? (
                      <Text variant="help">{person.signatureTradeoff}</Text>
                    ) : null}
                    {person.topTags.length > 0 ? (
                      <Inline gap={4}>
                        {person.topTags.map((t) => (
                          <Badge key={t} tone="neutral" dot={false}>
                            #{t}
                          </Badge>
                        ))}
                      </Inline>
                    ) : null}
                  </Stack>
                </Card>
              );
            })}
          </div>
        </Stack>
      ) : null}

      <AgentHandoffDialog
        open={Boolean(brewDialog)}
        onOpenChange={(next) => {
          if (!next) setBrewDialog(null);
        }}
        title={brewDialog?.title ?? "Brew in my AI"}
        description={brewDialog?.description ?? ""}
        prompt={brewDialog?.prompt ?? ""}
        activeGrantCount={activeGrantCount}
      />
    </Stack>
  );
}
