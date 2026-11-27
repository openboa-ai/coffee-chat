"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Breadcrumb } from "@openboa/yogurt/breadcrumb";
import { Button } from "@openboa/yogurt/button";
import { ButtonGroup } from "@openboa/yogurt/button-group";
import { Card } from "@openboa/yogurt/card";
import { DisclosureRow } from "@openboa/yogurt/disclosure-row";
import { Divider } from "@openboa/yogurt/divider";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Notice } from "@openboa/yogurt/notice";
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

  const orderedBeans = useMemo(
    () =>
      [...beans].sort(
        (a, b) =>
          Number(Boolean(a.supersededByBeanId)) -
          Number(Boolean(b.supersededByBeanId)),
      ),
    [beans],
  );

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
      router.push(
        `/signin?returnTo=${encodeURIComponent(`/sources/${originId}`)}`,
      );
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
        `Saved private Bean "${saved.title}" (visible only to you and your Agents).`,
      );
    }
  };

  const displayTitle = sourceTitle ?? normalizedUrl;

  return (
    <Stack gap={24}>
      <Breadcrumb
        label="Table breadcrumb"
        items={[
          { id: "home", label: "Home", href: "/" },
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
        detail="Table · Same source, different Taste — compare what each person prioritized and where their rule stops"
        action={
          <ButtonGroup label="Table actions">
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
              Roast your Bean
            </Button>
          </ButtonGroup>
        }
      />

      {toastMsg ? (
        <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
      ) : null}

      <Card variant="raised" density="compact">
        <Inline justify="between" align="center" gap={12} wrap>
          <Inline gap={12} align="center" wrap>
            <Badge tone="neutral" dot={false}>
              Source
            </Badge>
            <Link
              href={normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              emphasis="quiet"
              size="compact"
              className="source-url-link"
            >
              {normalizedUrl} ↗
            </Link>
            <Text variant="meta">
              {uniqueAuthors.length}{" "}
              {uniqueAuthors.length === 1 ? "person" : "people"} ·{" "}
              {beans.length} {beans.length === 1 ? "Bean" : "Beans"}
            </Text>
          </Inline>
          {sharedDomains.length > 0 ? (
            <Inline gap={6} align="center" wrap>
              {sharedDomains.map((tag) => (
                <Badge key={tag} tone="neutral" dot={false}>
                  {tag}
                </Badge>
              ))}
            </Inline>
          ) : null}
        </Inline>
      </Card>

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
                    <Surface
                      key={pb.id}
                      variant="surface"
                      density="compact"
                    >
                      <Stack gap={4}>
                        <Inline gap={8} align="center">
                          <Badge tone="neutral" dot={false}>
                            Private
                          </Badge>
                          <Text variant="body">{pb.title}</Text>
                        </Inline>
                        <Text variant="help">
                          What mattered more: {pb.tradeoff}
                        </Text>
                        <Text variant="meta">Except when: {pb.boundary}</Text>
                      </Stack>
                    </Surface>
                  ))}
                </Stack>
              </DisclosureRow>
            </Stack>
          </Notice>
        ) : (
          <Notice
            title="Your Stance · Pull up a chair"
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
            side by side with others.
          </Notice>
        )
      ) : null}

      <Stack gap={16}>
        <Stack gap={2}>
          <Text variant="meta">
            At this Table · {uniqueAuthors.length}{" "}
            {uniqueAuthors.length === 1 ? "person" : "people"}
          </Text>
          <Heading level={2}>How each person read this source</Heading>
        </Stack>

        <div className="table-dialogue-grid">
          {orderedBeans.map((b) => {
            const matchingOrigin =
              b.origins.find((o) => o.url === normalizedUrl) ??
              b.origins.find((o) => o.kind === "source_excerpt");
            const isSaved = Boolean(shelfMap[b.id]);
            const isSuperseded = Boolean(b.supersededByBeanId);

            return (
              <Card
                key={b.id}
                variant="raised"
                density="regular"
                className={isSuperseded ? "cc-bean-superseded" : undefined}
              >
                <Stack gap={16}>
                  <Inline justify="between" align="center" gap={8}>
                    <Inline gap={8} align="center">
                      <Avatar label={b.ownerDisplayName} size="compact" />
                      <Stack gap={2}>
                        <Link
                          href={`/@${b.ownerHandle}`}
                          className="person-inline-link"
                        >
                          <Text variant="body">{b.ownerDisplayName}</Text>
                          <Text variant="meta">@{b.ownerHandle}</Text>
                        </Link>
                        {isSuperseded ? (
                          <Badge tone="warning">Updated Mind · Earlier take</Badge>
                        ) : null}
                      </Stack>
                    </Inline>

                    <Button
                      emphasis={isSaved ? "quiet" : "soft"}
                      size="compact"
                      onClick={() => void toggleSaveBean(b)}
                    >
                      {isSaved ? "On Shelf" : "Save to Shelf"}
                    </Button>
                  </Inline>

                  {matchingOrigin?.quotation ? (
                    <blockquote className="cc-quote">
                      <Stack gap={4}>
                        <Text variant="help">
                          &ldquo;{matchingOrigin.quotation}&rdquo;
                        </Text>
                        {matchingOrigin.locator ? (
                          <Text variant="meta">{matchingOrigin.locator}</Text>
                        ) : null}
                      </Stack>
                    </blockquote>
                  ) : matchingOrigin?.locator ? (
                    <Text variant="meta">
                      Section: {matchingOrigin.locator}
                    </Text>
                  ) : null}

                  <Stack gap={12}>
                    <Heading level={3}>{b.title}</Heading>
                    <Text as="p" variant="body" className="editorial-lead">
                      {b.take}
                    </Text>

                    <div className="cc-criteria-grid">
                      <Stack gap={4} className="cc-criteria-col cc-criteria-priority">
                        <Text variant="meta" className="cc-criteria-label">
                          What mattered more
                        </Text>
                        <Text as="p" variant="body">
                          {b.tradeoff}
                        </Text>
                      </Stack>
                      <Stack gap={4} className="cc-criteria-col cc-criteria-boundary">
                        <Text variant="meta" className="cc-criteria-label">
                          Except when
                        </Text>
                        <Text as="p" variant="help">
                          {b.boundary}
                        </Text>
                      </Stack>
                    </div>
                  </Stack>

                  {b.tags.length > 0 ? (
                    <>
                      <Divider />
                      <Inline gap={6} align="center" wrap>
                        {b.tags.map((tag) => (
                          <Badge key={tag} tone="neutral" dot={false}>
                            #{tag}
                          </Badge>
                        ))}
                      </Inline>
                    </>
                  ) : null}
                </Stack>
              </Card>
            );
          })}
        </div>
      </Stack>

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
        title="Brew · Compare this Table in your Agent"
        description="Bring these contrasting confirmed trade-offs and boundaries into your decision"
        activeGrantCount={activeGrantCount}
        prompt={`Look at the Coffee Chat Table for "${displayTitle}" (${normalizedUrl}). Compare how the people at this Table weigh different trade-offs and draw different boundaries, and help me decide which criteria fit my current context without impersonating any author.`}
      />
    </Stack>
  );
}
