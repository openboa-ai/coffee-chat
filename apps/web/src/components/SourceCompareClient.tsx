"use client";

import { useState } from "react";
import { Notice, Stack } from "@openboa/yogurt";
import { PerspectiveDiffCard, type UiBeanDetail } from "@coffee-chat/ui";

export interface SourceCompareClientProps {
  normalizedUrl: string;
  beans: UiBeanDetail[];
}

export function SourceCompareClient({
  normalizedUrl,
  beans,
}: SourceCompareClientProps) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave = async (bean: UiBeanDetail) => {
    const res = await fetch("/api/shelf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "bean", beanId: bean.id }),
    });
    if (res.ok) {
      setSavedIds((prev) => [...prev, bean.id]);
      setNotice(`Saved "${bean.title}" to your Shelf.`);
    } else {
      setNotice("Sign in first to save Beans to your Shelf.");
    }
  };

  return (
    <Stack gap={16}>
      {notice ? (
        <Notice title="Shelf" tone="brand">
          {notice}
        </Notice>
      ) : null}
      <PerspectiveDiffCard
        subject={normalizedUrl}
        perspectives={beans}
        savedIds={savedIds}
        onSaveToShelf={handleSave}
        onOpenUrl={(url) => window.open(url, "_blank", "noopener,noreferrer")}
      />
    </Stack>
  );
}
