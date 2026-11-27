"use client";

import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { ButtonGroup } from "@openboa/yogurt/button-group";
import { CodeBlock } from "@openboa/yogurt/code-block";
import { Dialog } from "@openboa/yogurt/dialog";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { CopyButton } from "@openboa/yogurt/motion-copy-button";
import { Notice } from "@openboa/yogurt/notice";
import { Stack } from "@openboa/yogurt/stack";
import { Text } from "@openboa/yogurt/text";

export interface AgentHandoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  prompt: string;
  activeGrantCount?: number;
}

export function AgentHandoffDialog({
  open,
  onOpenChange,
  title,
  description,
  prompt,
  activeGrantCount,
}: AgentHandoffDialogProps) {
  const copyText = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
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
        {typeof activeGrantCount === "number" ? (
          activeGrantCount > 0 ? (
            <Notice title="Brew Ready · Agent connected" tone="success">
              You have {activeGrantCount} active connected{" "}
              {activeGrantCount === 1 ? "Agent" : "Agents"}. Paste this prompt
              into your Agent to Brew these Beans directly.
            </Notice>
          ) : (
            <Notice
              title="No Agent connected yet"
              tone="warning"
              action={
                <Link href="/connect" emphasis="soft" size="compact">
                  Open Brew Bar
                </Link>
              }
            >
              Connect your Agents once so they can read your Beans and Shelf
              automatically.
            </Notice>
          )
        ) : (
          <Inline gap={8} align="center" wrap>
            <Badge tone="neutral" dot={false}>
              Works with your connected Agents
            </Badge>
            <Link href="/connect" emphasis="quiet" size="compact">
              Setup in Brew Bar
            </Link>
          </Inline>
        )}

        <div className="prompt-code-wrap">
          <CodeBlock code={prompt} language="text" onCopy={copyText} />
        </div>

        <Inline justify="between" align="center" gap={12} wrap>
          <CopyButton value={prompt} onCopy={copyText} />
          <ButtonGroup label="Dialog actions">
            <Link href="/connect" emphasis="soft" size="compact">
              Brew Bar
            </Link>
            <Button
              emphasis="quiet"
              size="compact"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </ButtonGroup>
        </Inline>

        <Text variant="meta">
          Plain-language handoff — your connected Agent checks confirmed
          trade-offs and respects every stated boundary without impersonating
          anyone.
        </Text>
      </Stack>
    </Dialog>
  );
}
