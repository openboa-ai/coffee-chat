"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Checkbox } from "@openboa/yogurt/checkbox";
import { ConfirmDialog } from "@openboa/yogurt/confirm-dialog";
import { Dialog } from "@openboa/yogurt/dialog";
import { DisclosureRow } from "@openboa/yogurt/disclosure-row";
import { Divider } from "@openboa/yogurt/divider";
import { EmptyResult } from "@openboa/yogurt/empty-result";
import { FilterBar } from "@openboa/yogurt/filter-bar";
import { Icon } from "@openboa/yogurt/icon";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { List } from "@openboa/yogurt/list";
import { ListRow } from "@openboa/yogurt/list-row";
import { Notice } from "@openboa/yogurt/notice";
import { Pagination } from "@openboa/yogurt/pagination";
import { RecordFacts } from "@openboa/yogurt/record-facts";
import { SegmentedControl } from "@openboa/yogurt/segmented-control";
import { Select } from "@openboa/yogurt/select";
import { Sheet } from "@openboa/yogurt/sheet";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarLayout,
  SidebarTrigger,
} from "@openboa/yogurt/sidebar-layout";
import { Stack } from "@openboa/yogurt/stack";
import { Status } from "@openboa/yogurt/status";
import { Surface } from "@openboa/yogurt/surface";
import { Text } from "@openboa/yogurt/text";
import { TextField } from "@openboa/yogurt/text-field";
import { Toast } from "@openboa/yogurt/toast";
import { PageHeader } from "@openboa/yogurt/top";
import { Trace } from "@openboa/yogurt/trace";
import { formatRelationHumanLabel } from "@coffee-chat/ui";
import type {
  BeanDetail,
  BeanLifecycleState,
  BeanSummary,
  OriginKind,
  PersonalInsightsView,
  ShelfEntryView,
} from "@coffee-chat/core";
import { AgentHandoffDialog } from "./AgentHandoffDialog";
import { InsightsPanel } from "./InsightsPanel";
import { QuickCaptureSheet, type DraftRelation } from "./QuickCaptureSheet";

export type RoasteryTab = "workspace" | "insights" | "saved" | "settings";

export interface WorkspaceGrant {
  id: string;
  clientId: string;
  clientName: string;
  resource: string;
  scopes: string[];
  revokedAt: string | null;
  createdAt: string;
}

export interface WorkspaceAccount {
  id: string;
  providerId: string;
  accountId: string;
  createdAt: string;
}

export interface WorkspaceClientProps {
  user: { id: string; handle: string; name: string; email: string };
  initialBeans: BeanSummary[];
  initialTotalCount: number;
  initialAllBeansForRelations: Array<{ id: string; title: string }>;
  initialInsights: PersonalInsightsView;
  initialShelf: ShelfEntryView[];
  initialGrants: WorkspaceGrant[];
  initialAccounts: WorkspaceAccount[];
  initialTab?: RoasteryTab;
  initialTag?: string;
  startComposing?: boolean;
  testAuthEnabled: boolean;
  hasGithub: boolean;
  hasGoogle: boolean;
}

const PAGE_SIZE = 12;

export function WorkspaceClient({
  user,
  initialBeans,
  initialTotalCount,
  initialAllBeansForRelations,
  initialInsights,
  initialShelf,
  initialGrants,
  initialAccounts,
  initialTab = "workspace",
  initialTag = "",
  startComposing = false,
  testAuthEnabled,
  hasGithub,
  hasGoogle,
}: WorkspaceClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RoasteryTab>(initialTab);
  const [beans, setBeans] = useState<BeanSummary[]>(initialBeans);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [allBeanChoices, setAllBeanChoices] = useState(
    initialAllBeansForRelations,
  );
  const [insights, setInsights] =
    useState<PersonalInsightsView>(initialInsights);
  const [shelf, setShelf] = useState<ShelfEntryView[]>(initialShelf);
  const [grants, setGrants] = useState<WorkspaceGrant[]>(initialGrants);
  const [accounts, setAccounts] = useState<WorkspaceAccount[]>(initialAccounts);

  // Filters & pagination (server-backed via /api/beans)
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [originFilter, setOriginFilter] = useState<"all" | OriginKind>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<
    "all" | BeanLifecycleState | "private"
  >("all");
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);

  // Inspector & Roast sheet state
  const [inspectedBean, setInspectedBean] = useState<BeanDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [roastOpen, setRoastOpen] = useState(startComposing);
  const [editingBean, setEditingBean] = useState<BeanDetail | null>(null);
  const [prefillRelations, setPrefillRelations] = useState<DraftRelation[]>([]);

  // Lifecycle modals & feedback
  const [redactionTarget, setRedactionTarget] = useState<BeanDetail | null>(
    null,
  );
  const [redactionChecked, setRedactionChecked] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BeanDetail | null>(null);
  const [mutating, setMutating] = useState(false);
  const [inspectorConflict, setInspectorConflict] = useState<number | null>(
    null,
  );
  const [inspectorError, setInspectorError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Brew handoff dialog
  const [brewDialog, setBrewDialog] = useState<{
    title: string;
    description: string;
    prompt: string;
  } | null>(null);

  // Account linking state (dev/test explicit linking & Better Auth link-social)
  const [accountError, setAccountError] = useState<string | null>(null);
  const [testLinkProvider, setTestLinkProvider] = useState<"github" | "google">(
    "github",
  );
  const [testLinkId, setTestLinkId] = useState("");

  const activeGrants = useMemo(
    () => grants.filter((g) => !g.revokedAt),
    [grants],
  );

  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    for (const t of insights.topTags) set.add(t.tag);
    for (const b of beans) {
      for (const t of b.tags) set.add(t);
    }
    if (selectedTag) set.add(selectedTag);
    return Array.from(set).sort();
  }, [insights.topTags, beans, selectedTag]);

  const fetchBeans = useCallback(
    async (opts?: {
      q?: string;
      tag?: string;
      origin?: "all" | OriginKind;
      lifecycle?: "all" | BeanLifecycleState | "private";
      nextPage?: number;
    }) => {
      const qVal = opts?.q ?? query;
      const tagVal = opts?.tag ?? selectedTag;
      const originVal = opts?.origin ?? originFilter;
      const lifeVal = opts?.lifecycle ?? lifecycleFilter;
      const pageVal = opts?.nextPage ?? page;

      setLoadingList(true);
      try {
        const params = new URLSearchParams({
          scope: "mine",
          limit: String(PAGE_SIZE),
          offset: String((pageVal - 1) * PAGE_SIZE),
        });
        if (qVal.trim()) params.set("q", qVal.trim());
        if (tagVal) params.set("tag", tagVal);
        if (originVal !== "all") params.set("originKind", originVal);
        if (lifeVal === "private") {
          params.set("visibility", "private");
        } else if (lifeVal !== "all") {
          params.set("lifecycleState", lifeVal);
        }

        const res = await fetch(`/api/beans?${params.toString()}`);
        const data = (await res.json()) as {
          beans?: BeanSummary[];
          totalCount?: number;
        };
        if (res.ok && data.beans) {
          setBeans(data.beans);
          setTotalCount(data.totalCount ?? data.beans.length);
        }
      } finally {
        setLoadingList(false);
      }
    },
    [query, selectedTag, originFilter, lifecycleFilter, page],
  );

  const refreshInsights = useCallback(async () => {
    const res = await fetch("/api/insights");
    const data = (await res.json()) as { insights?: PersonalInsightsView };
    if (res.ok && data.insights) {
      setInsights(data.insights);
    }
  }, []);

  const refreshAllRelationChoices = useCallback(async () => {
    const res = await fetch("/api/beans?scope=mine&limit=100");
    const data = (await res.json()) as { beans?: BeanSummary[] };
    if (res.ok && data.beans) {
      setAllBeanChoices(data.beans.map((b) => ({ id: b.id, title: b.title })));
    }
  }, []);

  const openInspector = async (beanId: string): Promise<BeanDetail | null> => {
    setLoadingDetail(true);
    setInspectorConflict(null);
    setInspectorError(null);
    try {
      const res = await fetch(`/api/beans/${beanId}`);
      const data = (await res.json()) as { bean?: BeanDetail };
      if (res.ok && data.bean) {
        setInspectedBean(data.bean);
        return data.bean;
      }
      return null;
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleTabSwitch = (tab: RoasteryTab) => {
    setActiveTab(tab);
    const url = tab === "workspace" ? "/me" : `/me?tab=${tab}`;
    window.history.replaceState(null, "", url);
  };

  const handleRoastSaved = async (saved: BeanDetail) => {
    setToastMsg(
      editingBean
        ? `Saved revision v${saved.revisionNumber} of "${saved.title}".`
        : `Roasted Bean "${saved.title}" (${saved.visibility === "public" ? "On the Table" : "Private"}).`,
    );
    setEditingBean(null);
    setPrefillRelations([]);
    if (inspectedBean && inspectedBean.id === saved.id) {
      setInspectedBean(saved);
    }
    await Promise.all([
      fetchBeans(),
      refreshInsights(),
      refreshAllRelationChoices(),
    ]);
  };

  const executeVisibilityToggle = async (
    bean: BeanDetail,
    nextVis: "private" | "public",
    redactionConfirmed: boolean,
  ) => {
    setMutating(true);
    setInspectorError(null);
    setInspectorConflict(null);
    try {
      const res = await fetch(`/api/beans/${bean.id}/visibility`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          visibility: nextVis,
          expectedVersion: bean.version,
          operationKey: crypto.randomUUID(),
          redactionConfirmed,
        }),
      });
      const data = (await res.json()) as {
        bean?: BeanDetail;
        code?: string;
        message?: string;
        details?: { latestVersion?: number };
      };
      if (!res.ok || !data.bean) {
        if (data.code === "REDACTION_REQUIRED") {
          setRedactionTarget(bean);
          setRedactionChecked(false);
          return;
        }
        if (data.code === "VERSION_CONFLICT") {
          setInspectorConflict(data.details?.latestVersion ?? null);
          setInspectorError(
            data.message ?? "A newer version exists. Reload latest before retrying.",
          );
          return;
        }
        throw new Error(data.message ?? "Could not update visibility.");
      }
      setInspectedBean(data.bean);
      setRedactionTarget(null);
      setRedactionChecked(false);
      setToastMsg(
        nextVis === "public"
          ? `"${data.bean.title}" is now On the Table (shared publicly).`
          : `"${data.bean.title}" is now Private.`,
      );
      await Promise.all([fetchBeans(), refreshInsights()]);
    } catch (err) {
      setInspectorError(
        err instanceof Error ? err.message : "Could not update visibility.",
      );
    } finally {
      setMutating(false);
    }
  };

  const handleToggleVisibilityClick = (bean: BeanDetail) => {
    const nextVis = bean.visibility === "public" ? "private" : "public";
    const hasWork = bean.origins.some((o) => o.kind === "work_episode");
    if (nextVis === "public" && hasWork) {
      setRedactionTarget(bean);
      setRedactionChecked(false);
      return;
    }
    void executeVisibilityToggle(bean, nextVis, false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setMutating(true);
    try {
      const res = await fetch(`/api/beans/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: deleteTarget.version,
          operationKey: crypto.randomUUID(),
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "Could not delete Bean.");
      }
      const deletedTitle = deleteTarget.title;
      setDeleteTarget(null);
      setInspectedBean(null);
      setToastMsg(`Deleted Bean "${deletedTitle}".`);
      await Promise.all([
        fetchBeans(),
        refreshInsights(),
        refreshAllRelationChoices(),
      ]);
    } catch (err) {
      setInspectorError(
        err instanceof Error ? err.message : "Could not delete Bean.",
      );
      setDeleteTarget(null);
    } finally {
      setMutating(false);
    }
  };

  const handleRemoveOutgoingTension = async (bean: BeanDetail) => {
    const outgoingTensions = bean.relations.filter(
      (r) => r.direction === "outgoing" && r.kind === "tensions_with",
    );
    if (outgoingTensions.length === 0) {
      const incoming = bean.relations.find(
        (r) => r.direction === "incoming" && r.kind === "tensions_with",
      );
      if (incoming) {
        setToastMsg(
          `Opening originating Bean "${incoming.relatedBeanTitle}" to clear its tension link.`,
        );
        await openInspector(incoming.relatedBeanId);
      }
      return;
    }
    setMutating(true);
    setInspectorError(null);
    try {
      const keptRelations = bean.relations
        .filter(
          (r) => !(r.direction === "outgoing" && r.kind === "tensions_with"),
        )
        .filter((r) => r.direction === "outgoing")
        .map((r) => ({
          toBeanId: r.relatedBeanId,
          kind: r.kind,
          note: r.note,
        }));

      const origins = bean.origins.map((o) =>
        o.kind === "source_excerpt"
          ? {
              kind: "source_excerpt" as const,
              url: o.url!,
              sourceTitle: o.sourceTitle,
              quotation: o.quotation,
              locator: o.locator,
            }
          : {
              kind: "work_episode" as const,
              episodeSummary: o.episodeSummary!,
              locator: o.locator,
            },
      );

      const prepRes = await fetch("/api/beans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "prepare",
          input: {
            beanId: bean.id,
            expectedVersion: bean.version,
            title: bean.title,
            take: bean.take,
            tradeoff: bean.tradeoff,
            boundary: bean.boundary,
            uncertainty: bean.uncertainty,
            tags: bean.tags,
            visibility: bean.visibility,
            origins,
            relations: keptRelations,
          },
        }),
      });
      const prepData = (await prepRes.json()) as {
        prepared?: {
          canonicalPayload: Record<string, unknown>;
          digest: string;
          operationKey: string;
        };
        message?: string;
      };
      if (!prepRes.ok || !prepData.prepared) {
        throw new Error(prepData.message ?? "Could not prepare update.");
      }

      const saveRes = await fetch("/api/beans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...prepData.prepared.canonicalPayload,
          digest: prepData.prepared.digest,
          operationKey: prepData.prepared.operationKey,
          attestationKind: "ui_attested",
          redactionConfirmed: bean.visibility === "public",
        }),
      });
      const saveData = (await saveRes.json()) as {
        bean?: BeanDetail;
        message?: string;
      };
      if (!saveRes.ok || !saveData.bean) {
        throw new Error(saveData.message ?? "Could not clear tension link.");
      }
      setInspectedBean(saveData.bean);
      setToastMsg("Tension link cleared in a new Roast Log revision.");
      await Promise.all([fetchBeans(), refreshInsights()]);
    } catch (err) {
      setInspectorError(
        err instanceof Error ? err.message : "Could not clear tension link.",
      );
    } finally {
      setMutating(false);
    }
  };

  const handleRemoveShelf = async (shelfItemId: string) => {
    const res = await fetch("/api/shelf", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shelfItemId }),
    });
    if (res.ok) {
      setShelf((prev) => prev.filter((item) => item.id !== shelfItemId));
      setToastMsg("Removed from your Shelf.");
      await refreshInsights();
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    const res = await fetch(`/api/grants/${grantId}/revoke`, {
      method: "POST",
    });
    if (res.ok) {
      setGrants((prev) =>
        prev.map((g) =>
          g.id === grantId ? { ...g, revokedAt: new Date().toISOString() } : g,
        ),
      );
      setToastMsg("AI app connection revoked immediately.");
      await refreshInsights();
    }
  };

  const handleBetterAuthLink = async (provider: "github" | "google") => {
    setAccountError(null);
    try {
      const res = await fetch("/api/auth/link-social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, callbackURL: "/me?tab=settings" }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setAccountError(
        data.message ?? `Could not start ${provider} account linking.`,
      );
    } catch {
      setAccountError(`Could not reach ${provider} link endpoint.`);
    }
  };

  const handleTestAccountLink = async () => {
    if (!testLinkId.trim()) return;
    setAccountError(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerId: testLinkProvider,
        providerAccountId: testLinkId.trim(),
      }),
    });
    const data = (await res.json()) as {
      account?: { id: string; providerId: string; accountId: string };
      message?: string;
    };
    if (!res.ok) {
      setAccountError(data.message ?? "Could not link provider account.");
      return;
    }
    const listRes = await fetch("/api/accounts");
    const listData = (await listRes.json()) as { accounts?: WorkspaceAccount[] };
    if (listRes.ok && listData.accounts) {
      setAccounts(listData.accounts);
    }
    setTestLinkId("");
    setToastMsg(`Linked ${testLinkProvider} login method.`);
  };

  const handleUnlinkAccount = async (accountId: string) => {
    setAccountError(null);
    const res = await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      setAccountError(data.message ?? "Could not unlink login method.");
      return;
    }
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    setToastMsg("Unlinked login method.");
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const savedVoices = shelf.filter((s) => s.targetType === "person" && s.person);
  const savedBeans = shelf.filter((s) => s.targetType === "bean" && s.bean);

  return (
    <>
      <SidebarLayout
        label="My Roastery navigation"
        variant="inset"
        collapse="rail"
        navigation={
          <>
            <SidebarHeader>
              <Stack gap={4}>
                <Text variant="body">{user.name}</Text>
                <Text variant="meta">@{user.handle}</Text>
                <Status tone={activeGrants.length > 0 ? "success" : "neutral"}>
                  {activeGrants.length > 0
                    ? `Brew Ready (${activeGrants.length})`
                    : "AI not connected"}
                </Status>
              </Stack>
            </SidebarHeader>

            <SidebarContent label="My Roastery sections">
              <SidebarGroup label="My Roastery">
                <SidebarItem
                  label="My Beans"
                  description="Workspace & history"
                  icon={<Icon name="folder" />}
                  active={activeTab === "workspace"}
                  badge={
                    <Badge tone="neutral" dot={false}>
                      {insights.totalCount}
                    </Badge>
                  }
                  onSelect={() => handleTabSwitch("workspace")}
                />
                <SidebarItem
                  label="Tasting Notes"
                  description="Personal stats & insights"
                  icon={<Icon name="chart" />}
                  active={activeTab === "insights"}
                  onSelect={() => handleTabSwitch("insights")}
                />
                <SidebarItem
                  label="Shelf"
                  description="Saved voices & takes"
                  icon={<Icon name="bookmark" />}
                  active={activeTab === "saved"}
                  badge={
                    <Badge tone="neutral" dot={false}>
                      {shelf.length}
                    </Badge>
                  }
                  onSelect={() => handleTabSwitch("saved")}
                />
                <SidebarItem
                  label="AI & Account"
                  description="Connected AI apps & sign-in"
                  icon={<Icon name="sliders" />}
                  active={activeTab === "settings"}
                  onSelect={() => handleTabSwitch("settings")}
                />
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
              <Stack gap={8}>
                <Button
                  emphasis="filled"
                  tone="brand"
                  size="compact"
                  onClick={() => {
                    setEditingBean(null);
                    setPrefillRelations([]);
                    setRoastOpen(true);
                  }}
                >
                  + Roast a Bean
                </Button>
                <Link href="/connect">Brew Setup · Connect AI</Link>
              </Stack>
            </SidebarFooter>
          </>
        }
      >
        <Stack gap={24}>
          <Inline justify="between" align="center" gap={8}>
            <SidebarTrigger label="Toggle Roastery sidebar" showLabel />
            <Link href={`/@${user.handle}`}>View Voice Profile →</Link>
          </Inline>

          {toastMsg ? (
            <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
          ) : null}

          {activeTab === "workspace" ? (
            <Stack gap={24}>
              <PageHeader
                title="My Roastery"
                detail="My Beans · Personal judgment workspace & Roast Log"
                action={
                  <Inline gap={8}>
                    <Button
                      emphasis="soft"
                      size="compact"
                      onClick={() =>
                        setBrewDialog({
                          title: "Brew · Apply my Beans in AI",
                          description:
                            "Bring your active confirmed trade-offs and boundaries into your current work",
                          prompt:
                            "Before recommending an approach for this task, check my confirmed Coffee Chat Beans and the voices on my Shelf. Apply the trade-offs that match this context, name which Bean guided each call, and withhold any Bean outside its stated boundary.",
                        })
                      }
                    >
                      Brew in my AI
                    </Button>
                    <Button
                      emphasis="filled"
                      tone="brand"
                      size="compact"
                      onClick={() => {
                        setEditingBean(null);
                        setPrefillRelations([]);
                        setRoastOpen(true);
                      }}
                    >
                      Roast a Bean
                    </Button>
                  </Inline>
                }
              />

              {activeGrants.length > 0 ? (
                <Notice
                  title={`Brew Ready · ${activeGrants.length} connected AI ${activeGrants.length === 1 ? "app" : "apps"}`}
                  tone="success"
                  action={
                    <Button
                      emphasis="soft"
                      size="compact"
                      onClick={() => handleTabSwitch("settings")}
                    >
                      Manage connections
                    </Button>
                  }
                >
                  Your confirmed Beans and Shelf are live in your connected AI host.
                </Notice>
              ) : (
                <Notice
                  title="Brew Setup · Connect your AI app"
                  tone="neutral"
                  action={
                    <Button
                      emphasis="soft"
                      size="compact"
                      onClick={() => router.push("/connect")}
                    >
                      Open Brew Setup
                    </Button>
                  }
                >
                  No AI host is connected yet. Connect Codex, Claude Code, ChatGPT, Antigravity,
                  or Cursor in 30 seconds so your Beans shape real work decisions.
                </Notice>
              )}

              <Card variant="raised" density="compact">
                <Stack gap={12}>
                  <FilterBar
                    label="Search My Beans"
                    placeholder="Search headline, trade-off, domain, or source…"
                    query={query}
                    onQueryChange={(val) => {
                      setQuery(val);
                      setPage(1);
                      void fetchBeans({ q: val, nextPage: 1 });
                    }}
                  >
                    <Select
                      label="Domain"
                      value={selectedTag}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedTag(v);
                        setPage(1);
                        void fetchBeans({ tag: v, nextPage: 1 });
                      }}
                      options={[
                        { id: "", label: "All Domains" },
                        ...availableDomains.map((t) => ({
                          id: t,
                          label: `#${t}`,
                        })),
                      ]}
                    />
                    <Select
                      label="Origin"
                      value={originFilter}
                      onChange={(e) => {
                        const v = e.target.value as "all" | OriginKind;
                        setOriginFilter(v);
                        setPage(1);
                        void fetchBeans({ origin: v, nextPage: 1 });
                      }}
                      options={[
                        { id: "all", label: "All Origins" },
                        {
                          id: "source_excerpt",
                          label: "Reading Origin · From reading",
                        },
                        {
                          id: "work_episode",
                          label: "Work Origin · From work",
                        },
                      ]}
                    />
                  </FilterBar>

                  <SegmentedControl
                    label="Lifecycle filter"
                    value={lifecycleFilter}
                    onValueChange={(val) => {
                      const next = val as "all" | BeanLifecycleState | "private";
                      setLifecycleFilter(next);
                      setPage(1);
                      void fetchBeans({ lifecycle: next, nextPage: 1 });
                    }}
                    options={[
                      { id: "all", label: `All (${insights.totalCount})` },
                      {
                        id: "active",
                        label: `Active (${insights.lifecycle.activeCount})`,
                      },
                      {
                        id: "in_tension",
                        label: `In Tension (${insights.lifecycle.inTensionCount})`,
                      },
                      {
                        id: "superseded",
                        label: `Updated Mind (${insights.lifecycle.supersededCount})`,
                      },
                      {
                        id: "private",
                        label: `Private (${insights.privateCount})`,
                      },
                    ]}
                  />
                </Stack>
              </Card>

              {loadingList ? (
                <Text variant="meta">Refreshing My Beans…</Text>
              ) : beans.length === 0 ? (
                <EmptyResult
                  query={query || selectedTag || undefined}
                  onClear={
                    query ||
                    selectedTag ||
                    originFilter !== "all" ||
                    lifecycleFilter !== "all"
                      ? () => {
                          setQuery("");
                          setSelectedTag("");
                          setOriginFilter("all");
                          setLifecycleFilter("all");
                          setPage(1);
                          void fetchBeans({
                            q: "",
                            tag: "",
                            origin: "all",
                            lifecycle: "all",
                            nextPage: 1,
                          });
                        }
                      : undefined
                  }
                  empty="No Beans match this view yet. Roast your first Bean to start building your judgment criteria."
                />
              ) : (
                <Card variant="raised" density="compact">
                  <List label="Your confirmed Beans" divided>
                    {beans.map((b) => (
                      <ListRow
                        key={b.id}
                        title={b.title}
                        description={`Trade-off: ${b.tradeoffPreview}`}
                        inlineMeta={
                          <Inline gap={4} align="center">
                            <Badge
                              tone={
                                b.visibility === "public" ? "brand" : "neutral"
                              }
                              dot={false}
                            >
                              {b.visibility === "public"
                                ? "On the Table"
                                : "Private"}
                            </Badge>
                            {b.hasTension ? (
                              <Badge tone="warning">In Tension</Badge>
                            ) : null}
                            {b.supersededByBeanId ? (
                              <Badge tone="warning">Updated Mind</Badge>
                            ) : null}
                            {b.originKinds.includes("work_episode") ? (
                              <Badge tone="neutral" dot={false}>
                                Work Origin
                              </Badge>
                            ) : null}
                            {b.originKinds.includes("source_excerpt") ? (
                              <Badge tone="neutral" dot={false}>
                                Reading Origin
                              </Badge>
                            ) : null}
                          </Inline>
                        }
                        trailing={
                          <Text variant="meta">v{b.revisionNumber}</Text>
                        }
                        onActivate={() => void openInspector(b.id)}
                      />
                    ))}
                  </List>
                </Card>
              )}

              {totalPages > 1 ? (
                <Pagination
                  label="My Beans pages"
                  page={page}
                  pages={totalPages}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                    void fetchBeans({ nextPage });
                  }}
                />
              ) : null}
            </Stack>
          ) : null}

          {activeTab === "insights" ? (
            <InsightsPanel
              insights={insights}
              onSelectDomain={(tag) => {
                setSelectedTag(tag);
                setLifecycleFilter("all");
                setPage(1);
                handleTabSwitch("workspace");
                void fetchBeans({ tag, lifecycle: "all", nextPage: 1 });
              }}
              onSelectLifecycle={(state) => {
                setLifecycleFilter(state);
                setPage(1);
                handleTabSwitch("workspace");
                void fetchBeans({ lifecycle: state, nextPage: 1 });
              }}
              onOpenConnect={() => router.push("/connect")}
            />
          ) : null}

          {activeTab === "saved" ? (
            <Stack gap={24}>
              <PageHeader
                title="Shelf"
                detail="Saved voices & takes — live references that disappear if made Private"
              />

              <Card
                title="Saved Voices"
                description="People whose public Beans you follow and can Brew in your AI"
                headerAction={
                  <Badge tone="neutral" dot={false}>
                    {savedVoices.length}
                  </Badge>
                }
                variant="raised"
                density="regular"
              >
                {savedVoices.length === 0 ? (
                  <EmptyResult empty="No saved voices yet. Visit Explore or any Voice Profile to add someone to your Shelf." />
                ) : (
                  <List label="Saved voices" divided>
                    {savedVoices.map((entry) => (
                      <ListRow
                        key={entry.id}
                        title={entry.person!.displayName}
                        description={`@${entry.person!.handle} · ${entry.person!.publicBeanCount} public Beans`}
                        href={`/@${entry.person!.handle}`}
                        actions={
                          <Inline gap={8}>
                            <Button
                              emphasis="soft"
                              size="compact"
                              onClick={() =>
                                setBrewDialog({
                                  title: `Brew · Explore @${entry.person!.handle}'s Beans`,
                                  description:
                                    "Compare their public confirmed takes against your current question without impersonation",
                                  prompt: `Check the public Coffee Chat Beans shared by @${entry.person!.handle} on my Shelf that relate to this topic. Explain what trade-offs they prioritize, note where their boundaries stop, and attribute every point clearly to their confirmed records.`,
                                })
                              }
                            >
                              Brew voice
                            </Button>
                            <Button
                              emphasis="quiet"
                              size="compact"
                              onClick={() => void handleRemoveShelf(entry.id)}
                            >
                              Remove
                            </Button>
                          </Inline>
                        }
                      />
                    ))}
                  </List>
                )}
              </Card>

              <Card
                title="Saved Beans"
                description="Individual public takes pinned to your Shelf with trade-off previews and Table links"
                headerAction={
                  <Badge tone="neutral" dot={false}>
                    {savedBeans.length}
                  </Badge>
                }
                variant="raised"
                density="regular"
              >
                {savedBeans.length === 0 ? (
                  <EmptyResult empty="No saved Beans yet. Save any public take from Explore, a Table, or a Voice Profile." />
                ) : (
                  <List label="Saved Beans" divided>
                    {savedBeans.map((entry) => (
                      <ListRow
                        key={entry.id}
                        title={entry.bean!.title}
                        description={`@${entry.bean!.ownerHandle} · Trade-off: ${entry.bean!.tradeoff}`}
                        actions={
                          <Inline gap={8} align="center">
                            {entry.bean!.firstSourceOriginId ? (
                              <Link
                                href={`/sources/${entry.bean!.firstSourceOriginId}`}
                              >
                                Open Table →
                              </Link>
                            ) : null}
                            <Link href={`/@${entry.bean!.ownerHandle}`}>
                              Profile
                            </Link>
                            <Button
                              emphasis="quiet"
                              size="compact"
                              onClick={() => void handleRemoveShelf(entry.id)}
                            >
                              Remove
                            </Button>
                          </Inline>
                        }
                      />
                    ))}
                  </List>
                )}
              </Card>
            </Stack>
          ) : null}

          {activeTab === "settings" ? (
            <Stack gap={24}>
              <PageHeader
                title="AI & Account"
                detail="Connected AI apps, explicit login linking, and full Roastery export"
              />

              <Card
                title="Connected AI Apps"
                description="Live AI host authorizations — revoking cuts off access immediately"
                headerAction={
                  <Button
                    emphasis="soft"
                    size="compact"
                    onClick={() => router.push("/connect")}
                  >
                    Brew Setup
                  </Button>
                }
                variant="raised"
                density="regular"
              >
                {grants.length === 0 ? (
                  <EmptyResult empty="No AI apps connected yet. Visit Brew Setup to connect Codex, Claude Code, ChatGPT, Antigravity, or Cursor." />
                ) : (
                  <List label="Connected AI apps" divided>
                    {grants.map((g) => (
                      <ListRow
                        key={g.id}
                        title={g.clientName || g.clientId}
                        description={`${g.scopes.join(" · ")} · Connected ${new Date(g.createdAt).toLocaleDateString()}`}
                        inlineMeta={
                          <Badge
                            tone={g.revokedAt ? "neutral" : "success"}
                            dot={false}
                          >
                            {g.revokedAt ? "Revoked" : "Active"}
                          </Badge>
                        }
                        actions={
                          !g.revokedAt ? (
                            <Button
                              emphasis="quiet"
                              tone="danger"
                              size="compact"
                              onClick={() => void handleRevokeGrant(g.id)}
                            >
                              Revoke
                            </Button>
                          ) : undefined
                        }
                      />
                    ))}
                  </List>
                )}
              </Card>

              <Card
                title="Linked Sign-In Accounts"
                description="Explicit account linking only — unlinking your last remaining login method is blocked"
                variant="raised"
                density="regular"
              >
                <Stack gap={16}>
                  {accountError ? (
                    <Notice title="Account linking error" tone="danger">
                      {accountError}
                    </Notice>
                  ) : null}

                  <List label="Linked sign-in providers" divided>
                    {accounts.map((acc) => (
                      <ListRow
                        key={acc.id}
                        title={acc.providerId}
                        description={`Account ID: ${acc.accountId}`}
                        actions={
                          <Button
                            emphasis="quiet"
                            tone="danger"
                            size="compact"
                            disabled={accounts.length <= 1}
                            onClick={() => void handleUnlinkAccount(acc.id)}
                          >
                            Unlink
                          </Button>
                        }
                      />
                    ))}
                  </List>

                  {accounts.length <= 1 ? (
                    <Text variant="meta">
                      You must keep at least one sign-in method connected. Link a second provider
                      before unlinking.
                    </Text>
                  ) : null}

                  <Divider />

                  <Inline gap={12}>
                    <Button
                      emphasis="soft"
                      size="compact"
                      disabled={!hasGithub}
                      onClick={() => void handleBetterAuthLink("github")}
                    >
                      Link GitHub
                    </Button>
                    <Button
                      emphasis="soft"
                      size="compact"
                      disabled={!hasGoogle}
                      onClick={() => void handleBetterAuthLink("google")}
                    >
                      Link Google
                    </Button>
                  </Inline>

                  {testAuthEnabled ? (
                    <Surface variant="surface" density="compact">
                      <Stack gap={12}>
                        <Text variant="meta">
                          Test-Auth Explicit Linking (dev/E2E only)
                        </Text>
                        <Inline gap={8} align="end">
                          <Select
                            label="Provider"
                            value={testLinkProvider}
                            onChange={(e) =>
                              setTestLinkProvider(
                                e.target.value as "github" | "google",
                              )
                            }
                            options={[
                              { id: "github", label: "GitHub" },
                              { id: "google", label: "Google" },
                            ]}
                          />
                          <TextField
                            label="External Provider ID"
                            value={testLinkId}
                            onChange={(e) => setTestLinkId(e.target.value)}
                            placeholder="e.g., gh-alice-2"
                          />
                          <Button
                            emphasis="soft"
                            size="compact"
                            disabled={!testLinkId.trim()}
                            onClick={() => void handleTestAccountLink()}
                          >
                            Link Test Account
                          </Button>
                        </Inline>
                      </Stack>
                    </Surface>
                  ) : null}
                </Stack>
              </Card>

              <Card
                title="Export My Roastery"
                description="Download all your confirmed Beans, origins, relations, and Roast Log history"
                variant="raised"
                density="regular"
              >
                <Inline gap={12}>
                  <Link href="/api/export?format=json">Download JSON</Link>
                  <Link href="/api/export?format=markdown">
                    Download Markdown
                  </Link>
                </Inline>
              </Card>
            </Stack>
          ) : null}
        </Stack>
      </SidebarLayout>

      {/* Bean Inspector Sheet */}
      <Sheet
        open={Boolean(inspectedBean)}
        onOpenChange={(next) => {
          if (!next) {
            setInspectedBean(null);
            setInspectorConflict(null);
            setInspectorError(null);
          }
        }}
        title={inspectedBean?.title ?? "Bean Inspector"}
        description={
          inspectedBean
            ? `${inspectedBean.visibility === "public" ? "On the Table · Shared publicly" : "Private · Only me & my AI"} · ${inspectedBean.attestationKind === "agent_attested" ? "AI-Roasted · Captured in AI" : "Web-Roasted · Written on Web"}`
            : undefined
        }
      >
        {loadingDetail || !inspectedBean ? (
          <Text variant="meta">Loading Bean details…</Text>
        ) : (
          <Stack gap={16}>
            {inspectorConflict !== null ? (
              <Notice
                title="Version Conflict (409)"
                tone="warning"
                action={
                  <Button
                    emphasis="soft"
                    size="compact"
                    onClick={() => void openInspector(inspectedBean.id)}
                  >
                    Reload latest (v{inspectorConflict})
                  </Button>
                }
              >
                {inspectorError ??
                  "This Bean changed in another tab or AI session."}
              </Notice>
            ) : inspectorError ? (
              <Notice title="Action could not complete" tone="danger">
                {inspectorError}
              </Notice>
            ) : null}

            {inspectedBean.hasTension ? (
              <Notice
                title="In Tension · Conflicting criteria detected"
                tone="warning"
              >
                <Stack gap={8}>
                  <Text variant="help">
                    Resolve this tension so your AI knows which trade-off should
                    lead.
                  </Text>
                  <Inline gap={8}>
                    <Button
                      emphasis="soft"
                      size="compact"
                      onClick={() => {
                        setEditingBean(null);
                        setPrefillRelations([
                          {
                            toBeanId: inspectedBean.id,
                            kind: "supersedes",
                            note: "Reconciles open tension",
                          },
                        ]);
                        setRoastOpen(true);
                      }}
                    >
                      Roast reconciling Bean
                    </Button>
                    <Button
                      emphasis="soft"
                      size="compact"
                      onClick={() => {
                        setEditingBean(inspectedBean);
                        setPrefillRelations([]);
                        setRoastOpen(true);
                      }}
                    >
                      Edit this Bean
                    </Button>
                    <Button
                      emphasis="quiet"
                      size="compact"
                      disabled={mutating}
                      onClick={() =>
                        void handleRemoveOutgoingTension(inspectedBean)
                      }
                    >
                      Remove tension link
                    </Button>
                  </Inline>
                </Stack>
              </Notice>
            ) : null}

            <Stack gap={8}>
              <Text variant="meta">My Take · What clicked</Text>
              <Text as="p" variant="body">
                {inspectedBean.take}
              </Text>
            </Stack>

            <div className="bean-axis-tradeoff">
              <Stack gap={4}>
                <Text variant="meta">Trade-off · What mattered more</Text>
                <Text as="p" variant="body">
                  {inspectedBean.tradeoff}
                </Text>
              </Stack>
            </div>

            <div className="bean-axis-boundary">
              <Stack gap={4}>
                <Text variant="meta">
                  Boundary · When it doesn&apos;t apply
                </Text>
                <Text as="p" variant="help">
                  {inspectedBean.boundary}
                </Text>
              </Stack>
            </div>

            {inspectedBean.uncertainty ? (
              <Stack gap={4}>
                <Text variant="meta">Open Question</Text>
                <Text as="p" variant="help">
                  {inspectedBean.uncertainty}
                </Text>
              </Stack>
            ) : null}

            <Stack gap={8}>
              <Text variant="meta">
                Origins ({inspectedBean.origins.length})
              </Text>
              {inspectedBean.origins.map((o, idx) => (
                <Surface key={idx} variant="surface" density="compact">
                  <Stack gap={4}>
                    <Inline gap={8} align="center">
                      <Badge tone="neutral" dot={false}>
                        {o.kind === "source_excerpt"
                          ? "Reading Origin"
                          : "Work Origin"}
                      </Badge>
                      {o.locator ? (
                        <Text variant="meta">{o.locator}</Text>
                      ) : null}
                      {o.originId && inspectedBean.visibility === "public" ? (
                        <Link href={`/sources/${o.originId}`}>
                          Open Table →
                        </Link>
                      ) : null}
                    </Inline>
                    {o.kind === "source_excerpt" ? (
                      <>
                        <Text variant="body">{o.sourceTitle ?? o.url}</Text>
                        {o.quotation ? (
                          <blockquote className="bean-quote">
                            <Text variant="body">&ldquo;{o.quotation}&rdquo;</Text>
                          </blockquote>
                        ) : null}
                      </>
                    ) : (
                      <Text variant="body">{o.episodeSummary}</Text>
                    )}
                  </Stack>
                </Surface>
              ))}
            </Stack>

            {inspectedBean.relations.length > 0 ? (
              <Stack gap={8}>
                <Text variant="meta">Relations</Text>
                <List label="Bean relations" divided>
                  {inspectedBean.relations.map((r) => (
                    <ListRow
                      key={r.id}
                      title={r.relatedBeanTitle || r.relatedBeanId}
                      description={`${formatRelationHumanLabel(r.kind, r.direction)}${r.note ? ` — ${r.note}` : ""}`}
                      onActivate={() => void openInspector(r.relatedBeanId)}
                    />
                  ))}
                </List>
              </Stack>
            ) : null}

            {inspectedBean.revisions && inspectedBean.revisions.length > 0 ? (
              <Stack gap={8}>
                <Text variant="meta">Roast Log · Revision timeline</Text>
                <Trace
                  label="Roast Log revision timeline"
                  events={inspectedBean.revisions.map((rev) => ({
                    id: String(rev.revisionNumber),
                    title: `Rev ${rev.revisionNumber} · ${rev.title}`,
                    state: "complete",
                    detail: (
                      <Stack gap={4}>
                        <Text variant="meta">
                          {new Date(rev.createdAt).toLocaleString()} ·{" "}
                          {rev.attestationKind === "agent_attested"
                            ? "AI-Roasted"
                            : "Web-Roasted"}
                        </Text>
                        <Text variant="help">Trade-off: {rev.tradeoff}</Text>
                      </Stack>
                    ),
                  }))}
                />
              </Stack>
            ) : null}

            <DisclosureRow label="Verification details">
              <RecordFacts
                title="Immutable attestation"
                source="Coffee Chat"
                asOf={new Date(inspectedBean.updatedAt).toLocaleString()}
                facts={[
                  {
                    id: "ver",
                    label: "Version / Revision",
                    value: `v${inspectedBean.version} (rev ${inspectedBean.revisionNumber})`,
                  },
                  {
                    id: "digest",
                    label: "Canonical Digest",
                    value: inspectedBean.payloadDigest.slice(0, 24) + "…",
                  },
                ]}
              />
            </DisclosureRow>

            <Divider />

            <Inline gap={8}>
              <Button
                emphasis="soft"
                size="compact"
                onClick={() => {
                  setEditingBean(inspectedBean);
                  setPrefillRelations([]);
                  setRoastOpen(true);
                }}
              >
                Edit / Re-roast
              </Button>
              <Button
                emphasis="soft"
                size="compact"
                disabled={mutating}
                onClick={() => handleToggleVisibilityClick(inspectedBean)}
              >
                {inspectedBean.visibility === "public"
                  ? "Keep Private"
                  : "Put on the Table"}
              </Button>
              <Button
                emphasis="soft"
                size="compact"
                onClick={() =>
                  setBrewDialog({
                    title: `Brew · Apply "${inspectedBean.title}"`,
                    description:
                      "Use this confirmed Bean in your connected AI host",
                    prompt: `Apply my Coffee Chat Bean "${inspectedBean.title}" to this decision: prioritize "${inspectedBean.tradeoff}", and respect its boundary ("${inspectedBean.boundary}").`,
                  })
                }
              >
                Brew in my AI
              </Button>
              <Button
                emphasis="quiet"
                tone="danger"
                size="compact"
                disabled={mutating}
                onClick={() => setDeleteTarget(inspectedBean)}
              >
                Delete Bean
              </Button>
            </Inline>
          </Stack>
        )}
      </Sheet>

      {/* Progressive 2-Stage Roast Sheet */}
      <QuickCaptureSheet
        open={roastOpen}
        onOpenChange={(next) => {
          setRoastOpen(next);
          if (!next) {
            setEditingBean(null);
            setPrefillRelations([]);
          }
        }}
        existingBeans={allBeanChoices}
        editingBean={editingBean}
        initialRelations={prefillRelations}
        onSaved={(saved) => void handleRoastSaved(saved)}
        onReloadLatest={async (id) => openInspector(id)}
      />

      {/* Work Origin Redaction Modal (Dialog + Checkbox, since ConfirmDialog lacks children) */}
      <Dialog
        open={Boolean(redactionTarget)}
        onOpenChange={(next) => {
          if (!next) {
            setRedactionTarget(null);
            setRedactionChecked(false);
          }
        }}
        title="Work Origin Privacy Check"
        description="Required before putting a Work Origin Bean On the Table"
      >
        <Stack gap={16}>
          <Text variant="help">
            This Bean came from a work call. Confirm that you removed any
            confidential employer, client, or private internal details before
            sharing it publicly.
          </Text>
          <Checkbox
            label="I removed any private or confidential work details"
            checked={redactionChecked}
            onCheckedChange={(checked) =>
              setRedactionChecked(checked === true)
            }
          />
          <Inline justify="end" gap={8}>
            <Button
              emphasis="quiet"
              onClick={() => {
                setRedactionTarget(null);
                setRedactionChecked(false);
              }}
            >
              Cancel
            </Button>
            <Button
              emphasis="filled"
              tone="brand"
              disabled={!redactionChecked || mutating}
              pending={mutating}
              onClick={() => {
                if (redactionTarget) {
                  void executeVisibilityToggle(redactionTarget, "public", true);
                }
              }}
            >
              Put on the Table
            </Button>
          </Inline>
        </Stack>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
        pending={mutating}
        decision={{
          id: deleteTarget?.id ?? "",
          revision: String(deleteTarget?.version ?? 1),
          title: `Delete "${deleteTarget?.title ?? "Bean"}"?`,
          consequence:
            "This permanently deletes the Bean, its Roast Log history, and removes it from every Shelf.",
          confirmLabel: "Delete permanently",
          available: Boolean(deleteTarget),
          destructive: true,
        }}
        onConfirm={() => void handleConfirmDelete()}
      />

      {/* Plain-Language Brew Handoff Dialog */}
      <AgentHandoffDialog
        open={Boolean(brewDialog)}
        onOpenChange={(next) => {
          if (!next) setBrewDialog(null);
        }}
        title={brewDialog?.title ?? "Brew in my AI"}
        description={brewDialog?.description ?? ""}
        prompt={brewDialog?.prompt ?? ""}
        activeGrantCount={activeGrants.length}
      />
    </>
  );
}
