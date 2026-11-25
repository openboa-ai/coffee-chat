"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@openboa/yogurt/badge";
import { Breadcrumb } from "@openboa/yogurt/breadcrumb";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { DataTable } from "@openboa/yogurt/data-table";
import { DisclosureRow } from "@openboa/yogurt/disclosure-row";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Notice } from "@openboa/yogurt/notice";
import { RecordFacts } from "@openboa/yogurt/record-facts";
import { Stack } from "@openboa/yogurt/stack";
import { Surface } from "@openboa/yogurt/surface";
import { Text } from "@openboa/yogurt/text";
import { Toast } from "@openboa/yogurt/toast";
import { PageHeader } from "@openboa/yogurt/top";
import type {
  BeanDetail,
  BeanSummary,
  HydratedShelfRef,
} from "@coffee-chat/core";
import { AgentHandoffDialog } from "./AgentHandoffDialog";
import { QuickCaptureSheet } from "./QuickCaptureSheet";

export interface SourceCompareClientProps {
  originId: string;
  normalizedUrl: string;
  sourceTitle: string | null;
  initialBeans: BeanDetail[];
  viewerStance: BeanDetail[] | null;
  initialShelfRefs: HydratedShelfRef[];
  ownerBeanChoices: Array<Pick<BeanSummary, "id" | "title">>;
  signedIn: boolean;
  activeGrantCount?: number;
  startAdding?: boolean;
}

export function SourceCompareClient({
  originId,
  normalizedUrl,
  sourceTitle,
  initialBeans,
  viewerStance: initialViewerStance,
  initialShelfRefs,
  ownerBeanChoices,
  signedIn,
  activeGrantCount,
  startAdding = false,
}: SourceCompareClientProps) {
  const router = useRouter();
  const [beans, setBeans] = useState<BeanDetail[]>(initialBeans);
  const [viewerStance, setViewerStance] = useState<BeanDetail[] | null>(
    initialViewerStance,
  );
  const [shelfMap, setShelfMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const ref of initialShelfRefs) {
      if (ref.targetType === "bean") map[ref.targetId] = ref.shelfItemId;
    }
    return map;
  });
  const [roastOpen, setRoastOpen] = useState(startAdding && signedIn);
  const [brewOpen, setBrewOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const uniqueAuthors = useMemo(
    () => Array.from(new Set(beans.map((b) => b.ownerHandle))),
    [beans],
  );
  const sharedDomains = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of beans) {
      for (const t of b.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([t]) => `#${t}`);
  }, [beans]);

  const viewerPublic = (viewerStance ?? []).filter(
    (b) => b.visibility === "public",
  );
  const viewerPrivate = (viewerStance ?? []).filter(
    (b) => b.visibility === "private",
  );

  const toggleSaveBean = async (bean: BeanDetail) => {
    if (!signedIn) {
      router.push(`/signin?returnTo=${encodeURIComponent(`/sources/${originId}`)}`);
      return;
    }
    const existingShelfId = shelfMap[bean.id];
    if (existingShelfId) {
      const res = await fetch("/api/shelf", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shelfItemId: existingShelfId }),
      });
      if (res.ok) {
        setShelfMap((prev) => {
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
      setShelfMap((prev) => ({ ...prev, [bean.id]: data.item!.id }));
      setToastMsg(`Saved "${bean.title}" to your Shelf.`);
    }
  };

  const handleSavedRoast = (saved: BeanDetail) => {
    setViewerStance((prev) => [saved, ...(prev ?? [])]);
    if (saved.visibility === "public") {
      setBeans((prev) => [saved, ...prev.filter((b) => b.id !== saved.id)]);
      setToastMsg(`Added your Bean "${saved.title}" to this Table.`);
    } else {
      setToastMsg(
        `Saved private Bean "${saved.title}" (visible only to you and your AI).`,
      );
    }
  };

  const displayTitle = sourceTitle ?? normalizedUrl;

  return (
    <Stack gap={24}>
      <Breadcrumb
        label="Table breadcrumb"
        items={[
          { id: "explore", label: "Explore", href: "/" },
          { id: "tables", label: "Tables", href: "/sources" },
          {
            id: "current",
            label: displayTitle,
            href: `/sources/${originId}`,
          },
        ]}
      />

      <PageHeader
        title={displayTitle}
        detail="Table · Side-by-side Beans comparing what people prioritized and where their rules stop"
        action={
          <Inline gap={8}>
            <Button
              emphasis="soft"
              size="compact"
              onClick={() => setBrewOpen(true)}
            >
              Brew this Table
            </Button>
            <Button
              emphasis="filled"
              tone="brand"
              size="compact"
              onClick={() => {
                if (!signedIn) {
                  router.push(
                    `/signin?returnTo=${encodeURIComponent(`/sources/${originId}?add=1`)}`,
                  );
                  return;
                }
                setRoastOpen(true);
              }}
            >
              Roast a Bean for this Table
            </Button>
          </Inline>
        }
      />

      {toastMsg ? (
        <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
      ) : null}

      <RecordFacts
        title="Table Tasting Notes"
        source="Public Beans on this source"
        asOf="Live"
        facts={[
          {
            id: "url",
            label: "Original Source",
            value: (
              <Link
                href={normalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {normalizedUrl}
              </Link>
            ),
          },
          {
            id: "voices",
            label: "Voices at the Table",
            value: uniqueAuthors.length,
            unit: uniqueAuthors.length === 1 ? "voice" : "voices",
          },
          {
            id: "beans",
            label: "Public Beans",
            value: beans.length,
            unit: beans.length === 1 ? "Bean" : "Beans",
          },
          ...(sharedDomains.length > 0
            ? [
                {
                  id: "domains",
                  label: "Shared Domains",
                  value: sharedDomains.join(" · "),
                },
              ]
            : []),
        ]}
      />

      {signedIn ? (
        viewerPublic.length > 0 ? (
          <Notice
            title="Your Stance · Your Bean is on this Table"
            tone="success"
            action={
              <Button
                emphasis="soft"
                size="compact"
                onClick={() => router.push("/me")}
              >
                Manage in My Roastery
              </Button>
            }
          >
            You have {viewerPublic.length} public{" "}
            {viewerPublic.length === 1 ? "Bean" : "Beans"} on this Table
            {viewerPrivate.length > 0
              ? ` and ${viewerPrivate.length} private Bean(s) visible only to you.`
              : "."}
          </Notice>
        ) : viewerPrivate.length > 0 ? (
          <Notice
            title={`Your Stance · You have ${viewerPrivate.length} private ${viewerPrivate.length === 1 ? "Bean" : "Beans"} on this source (hidden from others)`}
            tone="accent"
            action={
              <Button
                emphasis="soft"
                size="compact"
                onClick={() => router.push("/me")}
              >
                Open in My Roastery
              </Button>
            }
          >
            <Stack gap={8}>
              <Text variant="help">
                Only you can see your private stance below. Put it On the Table
                from My Roastery whenever you want others to compare with it.
              </Text>
              <DisclosureRow label="Preview my private stance (only visible to me)">
                <Stack gap={8}>
                  {viewerPrivate.map((pb) => (
                    <Surface key={pb.id} variant="surface" density="compact">
                      <Stack gap={4}>
                        <Inline gap={8} align="center">
                          <Badge tone="neutral" dot={false}>
                            Private
                          </Badge>
                          <Text variant="body">{pb.title}</Text>
                        </Inline>
                        <Text variant="help">Trade-off: {pb.tradeoff}</Text>
                        <Text variant="meta">Boundary: {pb.boundary}</Text>
                      </Stack>
                    </Surface>
                  ))}
                </Stack>
              </DisclosureRow>
            </Stack>
          </Notice>
        ) : (
          <Notice
            title="Your Stance · Not on this Table yet"
            tone="neutral"
            action={
              <Button
                emphasis="soft"
                size="compact"
                onClick={() => setRoastOpen(true)}
              >
                Roast your Bean
              </Button>
            }
          >
            Capture your take privately first, or put it On the Table to compare
            side by side with these voices.
          </Notice>
        )
      ) : null}

      <Card
        title="Axis-by-Axis Comparison Matrix"
        description="Compare Origin Quotes, My Take, Trade-offs, and Boundaries across every public Bean"
        variant="raised"
        density="compact"
      >
        <div className="table-scroll">
          <DataTable
            caption={`Axis comparison for ${displayTitle}`}
            columns={[
              { id: "voice", label: "Voice", kind: "identity" },
              { id: "origin", label: "Origin Quote & Locator", kind: "text" },
              { id: "take", label: "My Take", kind: "text" },
              {
                id: "tradeoff",
                label: "Trade-off · What mattered more",
                kind: "text",
              },
              {
                id: "boundary",
                label: "Boundary · When it doesn't apply",
                kind: "text",
              },
              { id: "shelf", label: "Shelf", kind: "actions" },
            ]}
            rows={beans.map((b) => {
              const matchingOrigin =
                b.origins.find((o) => o.url === normalizedUrl) ??
                b.origins.find((o) => o.kind === "source_excerpt");
              const isSaved = Boolean(shelfMap[b.id]);
              return {
                id: b.id,
                cells: {
                  voice: (
                    <Stack gap={4}>
                      <Link href={`/@${b.ownerHandle}`}>
                        {b.ownerDisplayName}
                      </Link>
                      <Text variant="meta">@{b.ownerHandle}</Text>
                      {b.supersededByBeanId ? (
                        <Badge tone="warning">Updated Mind</Badge>
                      ) : null}
                    </Stack>
                  ),
                  origin: matchingOrigin?.quotation ? (
                    <Stack gap={4}>
                      <Text variant="help">
                        &ldquo;{matchingOrigin.quotation}&rdquo;
                      </Text>
                      {matchingOrigin.locator ? (
                        <Text variant="meta">{matchingOrigin.locator}</Text>
                      ) : null}
                    </Stack>
                  ) : (
                    <Text variant="meta">
                      {matchingOrigin?.locator ?? "Full source"}
                    </Text>
                  ),
                  take: (
                    <Stack gap={4}>
                      <Text variant="body">{b.title}</Text>
                      <Text variant="help">{b.take}</Text>
                    </Stack>
                  ),
                  tradeoff: <Text variant="body">{b.tradeoff}</Text>,
                  boundary: <Text variant="help">{b.boundary}</Text>,
                  shelf: (
                    <Button
                      emphasis={isSaved ? "quiet" : "soft"}
                      size="compact"
                      onClick={() => void toggleSaveBean(b)}
                    >
                      {isSaved ? "On Shelf" : "Save to Shelf"}
                    </Button>
                  ),
                },
              };
            })}
          />
        </div>
      </Card>

      {signedIn ? (
        <QuickCaptureSheet
          open={roastOpen}
          onOpenChange={setRoastOpen}
          existingBeans={ownerBeanChoices}
          initialUrl={normalizedUrl}
          initialSourceTitle={sourceTitle ?? ""}
          onSaved={handleSavedRoast}
        />
      ) : null}

      <AgentHandoffDialog
        open={brewOpen}
        onOpenChange={setBrewOpen}
        title="Brew · Compare this Table in my AI"
        description="Bring these contrasting confirmed trade-offs and boundaries into your decision"
        activeGrantCount={activeGrantCount}
        prompt={`Look at the Coffee Chat Table for "${displayTitle}" (${normalizedUrl}). Compare how the voices at this Table weigh different trade-offs and draw different boundaries, and help me decide which criteria fit my current context without impersonating any author.`}
      />
    </Stack>
  );
}
