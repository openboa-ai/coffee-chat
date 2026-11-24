"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  CodeBlock,
  Dialog,
  Inline,
  Link,
  Stack,
  Tabs,
  Text,
} from "@openboa/yogurt";

export interface AgentHandoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  talkPrompt: string;
  workPrompt: string;
}

export function AgentHandoffDialog({
  open,
  onOpenChange,
  title,
  description,
  talkPrompt,
  workPrompt,
}: AgentHandoffDialogProps) {
  const [tab, setTab] = useState("work");
  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  const copyText = async (mode: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode(null), 2000);
    } catch {
      setCopiedMode(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <Stack gap={16}>
        <Tabs
          label="Choose how to use in AI"
          value={tab}
          onValueChange={setTab}
          items={[
            {
              id: "work",
              label: "Apply to my work",
              panel: (
                <Stack gap={12}>
                  <Text variant="help">
                    Paste this into Claude, Codex, ChatGPT, or Antigravity to review your own draft
                    or decision using these confirmed trade-offs.
                  </Text>
                  <CodeBlock
                    code={workPrompt}
                    language="text"
                    onCopy={(text) => copyText("work", text)}
                  />
                  <Inline gap={8}>
                    <Button
                      emphasis="filled"
                      tone="brand"
                      size="compact"
                      onClick={() => copyText("work", workPrompt)}
                    >
                      {copiedMode === "work" ? "Copied prompt" : "Copy Work prompt"}
                    </Button>
                    <Badge tone="neutral">Attributes every trade-off</Badge>
                  </Inline>
                </Stack>
              ),
            },
            {
              id: "talk",
              label: "Coffee chat (Talk)",
              panel: (
                <Stack gap={12}>
                  <Text variant="help">
                    Explore how these perspectives see a topic—grounded strictly in confirmed
                    records, without impersonating anyone.
                  </Text>
                  <CodeBlock
                    code={talkPrompt}
                    language="text"
                    onCopy={(text) => copyText("talk", text)}
                  />
                  <Inline gap={8}>
                    <Button
                      emphasis="filled"
                      tone="brand"
                      size="compact"
                      onClick={() => copyText("talk", talkPrompt)}
                    >
                      {copiedMode === "talk" ? "Copied prompt" : "Copy Talk prompt"}
                    </Button>
                    <Badge tone="neutral">No impersonation</Badge>
                  </Inline>
                </Stack>
              ),
            },
          ]}
        />

        <div className="cc-row-between">
          <Text variant="meta">Haven&apos;t connected Coffee Chat to your AI yet?</Text>
          <Link href="/connect">30-second setup →</Link>
        </div>
      </Stack>
    </Dialog>
  );
}
