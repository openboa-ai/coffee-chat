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
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
import { BeanCard, type UiBeanDetail } from "@coffee-chat/ui";
import { AgentHandoffDialog } from "./AgentHandoffDialog";

export interface PersonClientProps {
  profile: {
    handle: string;
    displayName: string;
    publicCount: number;
    privateCount: number;
    publicBeans: UiBeanDetail[];
  };
  signedIn: boolean;
}

export function PersonClient({ profile, signedIn }: PersonClientProps) {
  const [savedPerson, setSavedPerson] = useState(false);
  const [savedBeans, setSavedBeans] = useState<string[]>([]);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of profile.publicBeans) {
      for (const t of b.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);
  }, [profile.publicBeans]);

  const talkPrompt = `Use Coffee Chat (Talk mode) with list_beans(scope="public", ownerHandle="${profile.handle}") to explore how @${profile.handle} makes sense of this topic. Cite their confirmed trade-offs and boundaries clearly, note anything outside their records, and never impersonate them.`;
  const workPrompt = `Use Coffee Chat (Work mode) with @${profile.handle}'s public Beans alongside my own Beans to review my plan. Show clearly where @${profile.handle}'s trade-offs agree or diverge from mine.`;

  const handleSavePerson = async () => {
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "person", handle: profile.handle }),
    });
    if (res.ok) {
      setSavedPerson(true);
      setNotice(`Saved @${profile.handle} to your Saved Voices.`);
    } else {
      setNotice("Sign in first to save perspectives to your Saved Voices.");
    }
  };

  const handleSaveBean = async (beanId: string) => {
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "bean", beanId }),
    });
    if (res.ok) {
      setSavedBeans((prev) => [...prev, beanId]);
      setNotice("Saved take to your Saved Voices (live reference).");
    } else {
      setNotice("Sign in first to save takes to your Saved Voices.");
    }
  };

  return (
    <Stack gap={24}>
      <Surface className="cc-hero">
        <Stack gap={16}>
          <div className="cc-row-between">
            <Inline gap={12}>
              <Avatar label={profile.displayName} size={48} />
              <Stack gap={2}>
                <Heading level={1}>{profile.displayName}</Heading>
                <Text variant="meta">@{profile.handle}</Text>
              </Stack>
            </Inline>
            <Inline gap={8}>
              <Badge tone="brand">{profile.publicCount} public</Badge>
              <Badge tone="neutral">{profile.privateCount} private</Badge>
            </Inline>
          </div>

          <Text variant="help">
            Private notes stay strictly between {profile.displayName} and their AI—only counts and
            explicitly shared takes appear here.
          </Text>

          {topTags.length > 0 ? (
            <div className="cc-chip-row">
              {topTags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  #{tag}
                </Badge>
              ))}
            </div>
          ) : null}

          <Inline gap={12}>
            <Button
              emphasis="filled"
              tone="brand"
              onClick={() => setHandoffOpen(true)}
            >
              Use @{profile.handle}&apos;s perspective in my AI
            </Button>
            <Button
              emphasis="soft"
              disabled={!signedIn || savedPerson}
              onClick={handleSavePerson}
            >
              {savedPerson ? "Saved to Shelf" : `Save @${profile.handle} to Shelf`}
            </Button>
          </Inline>
        </Stack>
      </Surface>

      <AgentHandoffDialog
        open={handoffOpen}
        onOpenChange={setHandoffOpen}
        title={`Coffee chat with @${profile.handle}'s takes`}
        description="Bring these confirmed perspectives straight into Claude, Codex, ChatGPT, or Antigravity."
        talkPrompt={talkPrompt}
        workPrompt={workPrompt}
      />

      {notice ? (
        <Notice title="Saved Voices" tone="brand">
          {notice}
        </Notice>
      ) : null}

      <Divider />

      <Stack gap={12}>
        <Heading level={2}>
          Shared Perspectives ({profile.publicBeans.length})
        </Heading>
        {profile.publicBeans.length === 0 ? (
          <EmptyResult
            empty={`@${profile.handle} hasn't shared any public perspectives yet.`}
          />
        ) : (
          <Stack gap={12}>
            {profile.publicBeans.map((bean) => {
              const firstSource = bean.origins.find(
                (o) => o.kind === "source_excerpt" && o.originId,
              );
              return (
                <BeanCard
                  key={bean.id}
                  bean={bean}
                  showOwner={false}
                  showVisibilityBadge={false}
                  actions={
                    <>
                      <Button
                        emphasis="soft"
                        size="compact"
                        disabled={!signedIn || savedBeans.includes(bean.id)}
                        onClick={() => handleSaveBean(bean.id)}
                      >
                        {savedBeans.includes(bean.id)
                          ? "Saved to Shelf"
                          : "Save Bean to Shelf"}
                      </Button>
                      {firstSource?.originId ? (
                        <Link href={`/sources/${firstSource.originId}`}>
                          Compare on Source Page
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
