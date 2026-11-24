"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Divider,
  EmptyResult,
  Heading,
  Inline,
  Link,
  Notice,
  SearchField,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
import {
  BeanCard,
  PerspectiveDiffCard,
  type UiBeanDetail,
} from "@coffee-chat/ui";
import { AgentHandoffDialog } from "./AgentHandoffDialog";

export interface HomeClientProps {
  signedIn: boolean;
  featuredSource: {
    originId: string;
    normalizedUrl: string;
    sourceTitle: string | null;
    beans: UiBeanDetail[];
  } | null;
  people: Array<{
    handle: string;
    displayName: string;
    publicCount: number;
    privateCount: number;
    signatureTradeoff: string | null;
    topTags: string[];
  }>;
  recentPublicBeans: UiBeanDetail[];
}

export function HomeClient({
  signedIn,
  featuredSource,
  people,
  recentPublicBeans,
}: HomeClientProps) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string>("all");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of recentPublicBeans) {
      for (const t of b.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
  }, [recentPublicBeans]);

  const filteredBeans = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recentPublicBeans.filter((b) => {
      if (activeTag !== "all" && !b.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.take.toLowerCase().includes(q) ||
        b.tradeoff.toLowerCase().includes(q) ||
        b.ownerHandle.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [recentPublicBeans, query, activeTag]);

  const handleSaveBean = async (bean: UiBeanDetail) => {
    if (!signedIn) {
      setNotice("Sign in first to save perspectives to your Saved Voices.");
      return;
    }
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "bean", beanId: bean.id }),
    });
    if (res.ok) {
      setSavedIds((prev) => [...prev, bean.id]);
      setNotice(`Saved "${bean.title}" to your Saved Voices.`);
    }
  };

  const featuredTitle =
    featuredSource?.sourceTitle ??
    featuredSource?.normalizedUrl ??
    "Shared Perspectives";
  const featuredHandles = Array.from(
    new Set((featuredSource?.beans ?? []).map((b) => `@${b.ownerHandle}`)),
  ).join(" and ");

  return (
    <Stack gap={32}>
      <Surface className="cc-hero">
        <Stack gap={16}>
          <Badge tone="brand">Coffee Chat</Badge>
          <Heading level={1}>
            Knowledge is shared. What a person makes of it is personal.
          </Heading>
          <p className="cc-paragraph">
            <Text variant="body">
              Two sharp people read the exact same essay and walk away with different trade-offs.
              Save the perspectives you actually stand behind—private by default—and bring them
              straight into your AI work and conversations.
            </Text>
          </p>
          <Inline gap={12}>
            <Link href={signedIn ? "/me?compose=1" : "/signin?returnTo=/me?compose=1"}>
              <Button emphasis="filled" tone="brand">
                Write your first take
              </Button>
            </Link>
            <Link href="/connect">
              <Button emphasis="soft">Connect to Claude, Codex, or ChatGPT</Button>
            </Link>
          </Inline>
        </Stack>
      </Surface>

      {notice ? (
        <Notice title="Saved Voices" tone="brand">
          {notice}
        </Notice>
      ) : null}

      {featuredSource ? (
        <Stack gap={12}>
          <div className="cc-row-between">
            <Stack gap={2}>
              <Heading level={2}>At the Table Right Now</Heading>
              <Text variant="help">
                Compare how {featuredHandles || "different people"} read the exact same piece.
              </Text>
            </Stack>
            <Inline gap={8}>
              <Link href={`/sources/${featuredSource.originId}?add=1`}>
                <Button emphasis="soft" size="compact">
                  Add your take
                </Button>
              </Link>
              <Button
                emphasis="filled"
                tone="brand"
                size="compact"
                onClick={() => setHandoffOpen(true)}
              >
                Coffee chat with these takes in AI
              </Button>
            </Inline>
          </div>

          <PerspectiveDiffCard
            subject={featuredTitle}
            subtitle={featuredSource.normalizedUrl}
            perspectives={featuredSource.beans}
            savedIds={savedIds}
            linkAuthors
            onSaveToShelf={handleSaveBean}
            onOpenUrl={(url) => window.open(url, "_blank", "noopener,noreferrer")}
          />

          <AgentHandoffDialog
            open={handoffOpen}
            onOpenChange={setHandoffOpen}
            title={`Coffee chat on "${featuredTitle}"`}
            description="Bring these contrasting confirmed takes straight into your own AI assistant."
            talkPrompt={`Use Coffee Chat (Talk mode) with compare_perspectives(url="${featuredSource.normalizedUrl}") to unpack how ${featuredHandles} disagree on this read—citing their exact trade-offs and boundaries without impersonating them.`}
            workPrompt={`Use Coffee Chat (Work mode) with compare_perspectives(url="${featuredSource.normalizedUrl}") alongside my own Beans to stress-test my current plan from both angles and tell me which trade-offs conflict.`}
          />
        </Stack>
      ) : null}

      {people.length > 0 ? (
        <Stack gap={12}>
          <div className="cc-row-between">
            <Stack gap={2}>
              <Heading level={2}>Voices at the Table</Heading>
              <Text variant="help">
                Explore how people weigh trade-offs. Private notes stay hidden—only counts show.
              </Text>
            </Stack>
            <Link href="/sources">See all shared reads →</Link>
          </div>

          <div className="cc-people-grid">
            {people.map((person) => (
              <Surface key={person.handle} className="cc-card-compact">
                <Stack gap={12}>
                  <div className="cc-row-between">
                    <Inline gap={8}>
                      <Avatar label={person.displayName} size={32} />
                      <Stack gap={2}>
                        <Link href={`/@${person.handle}`}>
                          <strong>{person.displayName}</strong>
                        </Link>
                        <Text variant="meta">@{person.handle}</Text>
                      </Stack>
                    </Inline>
                    <Inline gap={4}>
                      <Badge tone="brand">{person.publicCount} public</Badge>
                      <Badge tone="neutral">{person.privateCount} private</Badge>
                    </Inline>
                  </div>

                  {person.signatureTradeoff ? (
                    <Text variant="help">&ldquo;{person.signatureTradeoff}&rdquo;</Text>
                  ) : null}

                  <div className="cc-row-between">
                    <div className="cc-chip-row">
                      {person.topTags.map((t) => (
                        <Badge key={t} tone="neutral">
                          #{t}
                        </Badge>
                      ))}
                    </div>
                    <Link href={`/@${person.handle}`}>Sit down →</Link>
                  </div>
                </Stack>
              </Surface>
            ))}
          </div>
        </Stack>
      ) : null}

      <Divider />

      <Stack gap={16}>
        <div className="cc-row-between">
          <Stack gap={2}>
            <Heading level={2}>Recent Public Takes</Heading>
            <Text variant="help">
              Filter by topic or keyword to find perspectives worth bringing into your next decision.
            </Text>
          </Stack>
        </div>

        <SearchField
          label="Search takes, trade-offs, or @people"
          value={query}
          onValueChange={setQuery}
          placeholder="Try 'monolith', 'craft', 'security', or '@mina'"
        />

        {allTags.length > 0 ? (
          <div className="cc-chip-row">
            <Button
              emphasis={activeTag === "all" ? "filled" : "soft"}
              tone={activeTag === "all" ? "brand" : undefined}
              size="compact"
              onClick={() => setActiveTag("all")}
            >
              All
            </Button>
            {allTags.map((tag) => (
              <Button
                key={tag}
                emphasis={activeTag === tag ? "filled" : "soft"}
                tone={activeTag === tag ? "brand" : undefined}
                size="compact"
                onClick={() => setActiveTag(tag)}
              >
                #{tag}
              </Button>
            ))}
          </div>
        ) : null}

        {filteredBeans.length === 0 ? (
          <EmptyResult
            query={query}
            onClear={() => {
              setQuery("");
              setActiveTag("all");
            }}
            empty="No public perspectives yet. Share the first one from My Table."
          />
        ) : (
          <Stack gap={12}>
            {filteredBeans.map((bean) => {
              const firstSource = bean.origins.find(
                (o) => o.kind === "source_excerpt" && o.originId,
              );
              const isSaved = savedIds.includes(bean.id);
              return (
                <BeanCard
                  key={bean.id}
                  bean={bean}
                  showVisibilityBadge={false}
                  actions={
                    <>
                      <Button
                        emphasis={isSaved ? "quiet" : "soft"}
                        size="compact"
                        disabled={isSaved}
                        onClick={() => handleSaveBean(bean)}
                      >
                        {isSaved ? "Saved to Shelf" : "Save to Shelf"}
                      </Button>
                      {firstSource?.originId ? (
                        <Link href={`/sources/${firstSource.originId}`}>
                          Compare takes on this read →
                        </Link>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
