"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { EmptyResult } from "@openboa/yogurt/empty-result";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { CopyButton } from "@openboa/yogurt/motion-copy-button";
import { Stack } from "@openboa/yogurt/stack";
import { Text } from "@openboa/yogurt/text";
import { Toast } from "@openboa/yogurt/toast";
import { PageHeader } from "@openboa/yogurt/top";
import { BeanCard } from "@coffee-chat/ui";
import type { HydratedShelfRef, PersonProfileView } from "@coffee-chat/core";
import { AgentHandoffDialog } from "./AgentHandoffDialog";

export interface PersonClientProps {
  profile: PersonProfileView;
  initialShelfRefs: HydratedShelfRef[];
  signedIn: boolean;
  activeGrantCount?: number;
}

export function PersonClient({
  profile,
  initialShelfRefs,
  signedIn,
  activeGrantCount,
}: PersonClientProps) {
  const router = useRouter();
  const [personShelfId, setPersonShelfId] = useState<string | null>(
    () =>
      initialShelfRefs.find(
        (r) => r.targetType === "person" && r.targetId === profile.userId,
      )?.shelfItemId ?? null,
  );
  const [beanShelfMap, setBeanShelfMap] = useState<Record<string, string>>(
    () => {
      const map: Record<string, string> = {};
      for (const ref of initialShelfRefs) {
        if (ref.targetType === "bean") map[ref.targetId] = ref.shelfItemId;
      }
      return map;
    },
  );
  const [brewOpen, setBrewOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Public-only Tasting Notes derived strictly from profile.publicBeans (zero private leakage)
  const publicInsights = useMemo(() => {
    const tagCounts = new Map<string, number>();
    let readingCount = 0;
    let workCount = 0;
    for (const b of profile.publicBeans) {
      if (b.origins.some((o) => o.kind === "source_excerpt")) readingCount++;
      if (b.origins.some((o) => o.kind === "work_episode")) workCount++;
      for (const t of b.tags) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }
    const topPublicTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([t]) => `#${t}`);
    return { readingCount, workCount, topPublicTags };
  }, [profile.publicBeans]);

  const coffeeChatPrompt = `Have a Coffee Chat with ${profile.displayName} (@${profile.handle}) using their confirmed public Coffee Chat Beans. Walk through how they weigh trade-offs for my current decision, note where their boundaries stop, and attribute every point explicitly without impersonating them.`;

  const copyText = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  const toggleSavePerson = async () => {
    if (!signedIn) {
      router.push(
        `/signin?returnTo=${encodeURIComponent(`/@${profile.handle}`)}`,
      );
      return;
    }
    if (personShelfId) {
      const res = await fetch("/api/shelf", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shelfItemId: personShelfId }),
      });
      if (res.ok) {
        setPersonShelfId(null);
        setToastMsg(`Removed @${profile.handle} from your Shelf.`);
      }
      return;
    }

    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "person", handle: profile.handle }),
    });
    const data = (await res.json()) as { item?: { id: string } };
    if (res.ok && data.item?.id) {
      setPersonShelfId(data.item.id);
      setToastMsg(`Added @${profile.handle} to your Shelf.`);
    }
  };

  const toggleSaveBean = async (beanId: string, title: string) => {
    if (!signedIn) {
      router.push(
        `/signin?returnTo=${encodeURIComponent(`/@${profile.handle}`)}`,
      );
      return;
    }
    const existingId = beanShelfMap[beanId];
    if (existingId) {
      const res = await fetch("/api/shelf", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shelfItemId: existingId }),
      });
      if (res.ok) {
        setBeanShelfMap((prev) => {
          const next = { ...prev };
          delete next[beanId];
          return next;
        });
        setToastMsg(`Removed "${title}" from your Shelf.`);
      }
      return;
    }
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "bean", beanId }),
    });
    const data = (await res.json()) as { item?: { id: string } };
    if (res.ok && data.item?.id) {
      setBeanShelfMap((prev) => ({ ...prev, [beanId]: data.item!.id }));
      setToastMsg(`Saved "${title}" to your Shelf.`);
    }
  };

  return (
    <Stack gap={24}>
      <PageHeader
        title={profile.displayName}
        detail={`@${profile.handle} · Confirmed public Taste ready for a Coffee Chat in your AI`}
        leading={<Avatar label={profile.displayName} size="large" />}
        action={
          <Inline gap={8}>
            <Button
              emphasis={personShelfId ? "quiet" : "soft"}
              size="compact"
              onClick={() => void toggleSavePerson()}
            >
              {personShelfId ? "Voice on Shelf" : "Add Voice to Shelf"}
            </Button>
            <Button
              emphasis="filled"
              tone="brand"
              size="compact"
              onClick={() => setBrewOpen(true)}
            >
              Coffee Chat with @{profile.handle}
            </Button>
          </Inline>
        }
      />

      {toastMsg ? (
        <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
      ) : null}

      {/* Direct Coffee Chat Prompt Strip */}
      <Card
        title={`Ask your AI to Coffee Chat with @${profile.handle}’s Taste`}
        description="Copy straight into ChatGPT, Claude, Codex, Cursor, or Antigravity — attributed to confirmed Beans, never impersonated"
        variant="outlined"
        density="compact"
        action={<CopyButton value={coffeeChatPrompt} onCopy={copyText} />}
      >
        <Text variant="body">&ldquo;{coffeeChatPrompt}&rdquo;</Text>
      </Card>

      {/* Clean hairline Voice Tasting Notes strip (public counts & public tags only) */}
      <Card variant="raised" density="regular">
        <Stack gap={12}>
          <div className="taste-strip">
            <div className="taste-metric">
              <Text variant="meta">On the Table · Public Beans</Text>
              <span className="taste-metric-value">{profile.publicCount}</span>
              <Text variant="meta">
                {publicInsights.readingCount} from reading ·{" "}
                {publicInsights.workCount} from work
              </Text>
            </div>

            <div className="taste-metric">
              <Text variant="meta">Private Beans (count only)</Text>
              <span className="taste-metric-value">{profile.privateCount}</span>
              <Text variant="meta">
                Kept private in @{profile.handle}&apos;s Roastery
              </Text>
            </div>
          </div>

          {publicInsights.topPublicTags.length > 0 ? (
            <Inline gap={6} align="center" wrap>
              <Text variant="meta">Public Domains:</Text>
              {publicInsights.topPublicTags.map((tag) => (
                <Badge key={tag} tone="neutral" dot={false}>
                  {tag}
                </Badge>
              ))}
            </Inline>
          ) : null}
        </Stack>
      </Card>

      {profile.publicBeans.length === 0 ? (
        <EmptyResult
          empty={`@${profile.handle} has not put any Beans On the Table yet.`}
        />
      ) : (
        <Stack gap={16}>
          {profile.publicBeans.map((bean) => {
            const firstSourceOriginId = bean.origins.find(
              (o) => o.kind === "source_excerpt" && o.originId,
            )?.originId;
            const isSaved = Boolean(beanShelfMap[bean.id]);
            return (
              <BeanCard
                key={bean.id}
                bean={bean}
                showOwner={false}
                actions={
                  <Inline gap={8} align="center">
                    <Button
                      emphasis={isSaved ? "quiet" : "soft"}
                      size="compact"
                      onClick={() => void toggleSaveBean(bean.id, bean.title)}
                    >
                      {isSaved ? "On Shelf" : "Save to Shelf"}
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

      <AgentHandoffDialog
        open={brewOpen}
        onOpenChange={setBrewOpen}
        title={`Coffee Chat with @${profile.handle}`}
        description="Bring their confirmed trade-offs and boundaries into your AI without impersonation"
        activeGrantCount={activeGrantCount}
        prompt={coffeeChatPrompt}
      />
    </Stack>
  );
}
