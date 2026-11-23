"use client";

import { useState } from "react";
import {
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
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const talkPrompt = `Use Coffee Chat Brew (Talk mode) with MCP list_beans(scope="public", ownerHandle="${profile.handle}") to explore @${profile.handle}'s confirmed perspectives without impersonating them.`;

  const handleSavePerson = async () => {
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "person", handle: profile.handle }),
    });
    if (res.ok) {
      setSavedPerson(true);
      setNotice(`Saved @${profile.handle} to your Shelf.`);
    } else {
      setNotice("Sign in first to save perspectives to your Shelf.");
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
      setNotice("Saved Bean to your Shelf (live reference).");
    } else {
      setNotice("Sign in first to save Beans to your Shelf.");
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(talkPrompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Stack gap={24}>
      <Surface className="cc-card">
        <Stack gap={12}>
          <div className="cc-row-between">
            <Stack gap={4}>
              <Heading level={1}>{profile.displayName}</Heading>
              <Text variant="meta">@{profile.handle}</Text>
            </Stack>
            <Inline gap={8}>
              <Badge tone="brand">{profile.publicCount} public</Badge>
              <Badge tone="neutral">{profile.privateCount} private</Badge>
            </Inline>
          </div>

          <Text variant="help">
            Private Beans remain hidden—only aggregate counts and explicitly published Beans appear
            here.
          </Text>

          <Inline gap={8}>
            <Button
              emphasis="filled"
              tone="brand"
              disabled={!signedIn || savedPerson}
              onClick={handleSavePerson}
            >
              {savedPerson ? "Saved to Shelf" : `Save @${profile.handle} to Shelf`}
            </Button>
            <Button emphasis="soft" onClick={handleCopyPrompt}>
              {copied ? "Copied Agent Prompt" : "Open Coffee Chat in My Agent"}
            </Button>
          </Inline>

          <pre className="cc-pre">{talkPrompt}</pre>
        </Stack>
      </Surface>

      {notice ? (
        <Notice title="Shelf" tone="brand">
          {notice}
        </Notice>
      ) : null}

      <Divider />

      <Stack gap={12}>
        <Heading level={2}>Public Confirmed Perspectives ({profile.publicBeans.length})</Heading>
        {profile.publicBeans.length === 0 ? (
          <EmptyResult empty={`@${profile.handle} has not published any public Beans yet.`} />
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
                  actions={
                    <>
                      <Button
                        emphasis="soft"
                        size="compact"
                        disabled={!signedIn || savedBeans.includes(bean.id)}
                        onClick={() => handleSaveBean(bean.id)}
                      >
                        {savedBeans.includes(bean.id) ? "Saved to Shelf" : "Save Bean to Shelf"}
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
