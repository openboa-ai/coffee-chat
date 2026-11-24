"use client";

import { useState } from "react";
import {
  Button,
  Inline,
  Link,
  Notice,
  Stack,
  Text,
} from "@openboa/yogurt";
import { PerspectiveDiffCard, type UiBeanDetail } from "@coffee-chat/ui";
import { AgentHandoffDialog } from "./AgentHandoffDialog";
import { QuickCaptureForm } from "./QuickCaptureForm";

export interface SourceCompareClientProps {
  originId: string;
  normalizedUrl: string;
  sourceTitle: string | null;
  initialBeans: UiBeanDetail[];
  signedIn: boolean;
  startAdding?: boolean;
}

export function SourceCompareClient({
  originId,
  normalizedUrl,
  sourceTitle,
  initialBeans,
  signedIn,
  startAdding = false,
}: SourceCompareClientProps) {
  const [beans, setBeans] = useState(initialBeans);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(startAdding && signedIn);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave = async (bean: UiBeanDetail) => {
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "bean", beanId: bean.id }),
    });
    if (res.ok) {
      setSavedIds((prev) => [...prev, bean.id]);
      setNotice(`Saved "${bean.title}" to your Saved Voices.`);
    } else {
      setNotice("Sign in first to save perspectives to your Saved Voices.");
    }
  };

  const displayTitle = sourceTitle ?? normalizedUrl;
  const handles = Array.from(new Set(beans.map((b) => `@${b.ownerHandle}`))).join(
    ", ",
  );

  return (
    <Stack gap={24}>
      <div className="cc-row-between">
        <Link href="/sources">← All Tables</Link>
        <Inline gap={8}>
          {signedIn ? (
            <Button
              emphasis="soft"
              size="compact"
              onClick={() => setShowAdd((v) => !v)}
            >
              {showAdd ? "Close" : "Add your take to this table"}
            </Button>
          ) : (
            <Link href={`/signin?returnTo=/sources/${originId}?add=1`}>
              <Button emphasis="soft" size="compact">
                Sign in to add your take
              </Button>
            </Link>
          )}
          <Button
            emphasis="filled"
            tone="brand"
            size="compact"
            onClick={() => setHandoffOpen(true)}
          >
            Coffee chat in my AI
          </Button>
        </Inline>
      </div>

      {notice ? (
        <Notice title="Table updated" tone="brand">
          {notice}
        </Notice>
      ) : null}

      {showAdd ? (
        <QuickCaptureForm
          defaultUrl={normalizedUrl}
          defaultSourceTitle={sourceTitle ?? undefined}
          onCancel={() => setShowAdd(false)}
          onSaved={(saved) => {
            setShowAdd(false);
            if (saved.visibility === "public") {
              setBeans((prev) => [saved, ...prev]);
              setNotice(`Added "${saved.title}" to this table.`);
            } else {
              setNotice(
                `Saved "${saved.title}" privately in My Table. Switch it to public anytime to show it on this shared table.`,
              );
            }
          }}
        />
      ) : null}

      <PerspectiveDiffCard
        subject={displayTitle}
        subtitle={sourceTitle ? normalizedUrl : undefined}
        perspectives={beans}
        savedIds={savedIds}
        linkAuthors
        onSaveToShelf={handleSave}
        onOpenUrl={(url) => window.open(url, "_blank", "noopener,noreferrer")}
      />

      <Text variant="meta">
        Comparing public takes from {handles || "contributors"}. Private notes on this URL remain
        strictly hidden.
      </Text>

      <AgentHandoffDialog
        open={handoffOpen}
        onOpenChange={setHandoffOpen}
        title={`Coffee chat on "${displayTitle}"`}
        description="Compare these contrasting views inside Claude, Codex, ChatGPT, or Antigravity."
        talkPrompt={`Use Coffee Chat (Talk mode) with compare_perspectives(url="${normalizedUrl}") to compare how ${handles} interpret this read differently—highlighting their trade-offs and boundaries without impersonating anyone.`}
        workPrompt={`Use Coffee Chat (Work mode) with compare_perspectives(url="${normalizedUrl}") alongside my own Beans to evaluate my current decision from each side.`}
      />
    </Stack>
  );
}
