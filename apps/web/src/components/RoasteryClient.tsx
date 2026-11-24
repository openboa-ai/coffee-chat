"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Dialog,
  EmptyResult,
  Heading,
  Inline,
  Link,
  Notice,
  SearchField,
  SegmentedControl,
  Stack,
  Surface,
  Tabs,
  Text,
} from "@openboa/yogurt";
import { BeanCard, type UiBeanDetail } from "@coffee-chat/ui";
import { AgentHandoffDialog } from "./AgentHandoffDialog";
import { QuickCaptureForm } from "./QuickCaptureForm";

export interface RoasteryClientProps {
  user: { id: string; handle: string; name: string; email: string };
  initialBeans: UiBeanDetail[];
  initialShelf: Array<{
    id: string;
    targetType: "person" | "bean";
    person?: { handle: string; displayName: string; publicBeanCount: number };
    bean?: { beanId: string; title: string; ownerHandle: string };
  }>;
  initialGrants: Array<{
    id: string;
    clientName: string;
    scopes: string[];
    revokedAt: string | null;
    createdAt: string;
  }>;
  initialAccounts: Array<{
    id: string;
    providerId: string;
    accountId: string;
  }>;
  startComposing?: boolean;
}

export function RoasteryClient({
  user,
  initialBeans,
  initialShelf,
  initialGrants,
  initialAccounts,
  startComposing = false,
}: RoasteryClientProps) {
  const [activeTab, setActiveTab] = useState("perspectives");
  const [beans, setBeans] = useState(initialBeans);
  const [shelf, setShelf] = useState(initialShelf);
  const [grants, setGrants] = useState(initialGrants);
  const [accounts, setAccounts] = useState(initialAccounts);

  const [query, setQuery] = useState("");
  const [visFilter, setVisFilter] = useState<"all" | "private" | "public">("all");
  const [showComposer, setShowComposer] = useState(startComposing);
  const [editingBean, setEditingBean] = useState<UiBeanDetail | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog states
  const [redactionBean, setRedactionBean] = useState<UiBeanDetail | null>(null);
  const [redactionChecked, setRedactionChecked] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UiBeanDetail | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);

  const publicCount = beans.filter((b) => b.visibility === "public").length;
  const privateCount = beans.length - publicCount;
  const activeGrantsCount = grants.filter((g) => !g.revokedAt).length;

  const filteredBeans = useMemo(() => {
    const q = query.trim().toLowerCase();
    return beans.filter((b) => {
      if (visFilter !== "all" && b.visibility !== visFilter) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.take.toLowerCase().includes(q) ||
        b.tradeoff.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [beans, query, visFilter]);

  const executeVisibilityToggle = async (
    bean: UiBeanDetail,
    nextVisibility: "private" | "public",
    redactionConfirmed: boolean,
  ) => {
    setBusyId(bean.id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/beans/${bean.id}/visibility`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          visibility: nextVisibility,
          expectedVersion: bean.version,
          operationKey: crypto.randomUUID(),
          redactionConfirmed,
        }),
      });
      const data = (await res.json()) as { bean?: UiBeanDetail; message?: string };
      if (!res.ok || !data.bean) {
        throw new Error(data.message ?? "Could not change visibility.");
      }
      setBeans((prev) => prev.map((b) => (b.id === bean.id ? data.bean! : b)));
      setRedactionBean(null);
      setRedactionChecked(false);
      setStatusMessage(
        data.bean.visibility === "public"
          ? `Shared "${data.bean.title}" on your public page.`
          : `Moved "${data.bean.title}" back to Private.`,
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleVisibility = (bean: UiBeanDetail) => {
    const next = bean.visibility === "public" ? "private" : "public";
    const hasWorkEpisode = bean.origins.some((o) => o.kind === "work_episode");
    if (next === "public" && hasWorkEpisode) {
      setRedactionBean(bean);
      setRedactionChecked(false);
      return;
    }
    void executeVisibilityToggle(bean, next, false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const bean = deleteTarget;
    setBusyId(bean.id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/beans/${bean.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: bean.version,
          operationKey: crypto.randomUUID(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Delete failed.");
      }
      setBeans((prev) => prev.filter((b) => b.id !== bean.id));
      setDeleteTarget(null);
      setStatusMessage(`Deleted "${bean.title}".`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveShelf = async (shelfItemId: string) => {
    await fetch("/api/shelf", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shelfItemId }),
    });
    setShelf((prev) => prev.filter((s) => s.id !== shelfItemId));
  };

  const handleRevokeGrant = async (grantId: string) => {
    const res = await fetch(`/api/grants/${grantId}/revoke`, { method: "POST" });
    if (res.ok) {
      setGrants((prev) =>
        prev.map((g) =>
          g.id === grantId ? { ...g, revokedAt: new Date().toISOString() } : g,
        ),
      );
      setStatusMessage("Revoked AI connection and invalidated all active tokens.");
    }
  };

  const handleUnlinkAccount = async (accountId: string) => {
    setErrorMessage(null);
    const res = await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      setErrorMessage(data.message ?? "Could not unlink login provider.");
      return;
    }
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
  };

  const shelfHandles = shelf
    .filter((s) => s.targetType === "person" && s.person)
    .map((s) => `@${s.person!.handle}`)
    .join(", ");

  return (
    <Stack gap={24}>
      <div className="cc-row-between">
        <Inline gap={12}>
          <Avatar label={user.name} size={44} />
          <Stack gap={2}>
            <Heading level={1}>My Table</Heading>
            <Inline gap={8}>
              <Text variant="meta">@{user.handle}</Text>
              <Badge tone="brand">{publicCount} public</Badge>
              <Badge tone="neutral">{privateCount} private</Badge>
            </Inline>
          </Stack>
        </Inline>
        <Inline gap={8}>
          <Link href={`/@${user.handle}`}>View Public Page</Link>
          <Button
            emphasis="soft"
            size="compact"
            onClick={() => setHandoffOpen(true)}
          >
            Use in my AI
          </Button>
          <Button
            emphasis="filled"
            tone="brand"
            onClick={() => {
              setActiveTab("perspectives");
              setEditingBean(null);
              setShowComposer((v) => !v);
            }}
          >
            {showComposer ? "Close" : "New Take"}
          </Button>
        </Inline>
      </div>

      {statusMessage ? (
        <Notice title="Saved" tone="success">
          {statusMessage}
        </Notice>
      ) : null}

      {errorMessage ? (
        <Notice title="Action failed" tone="danger">
          {errorMessage}
        </Notice>
      ) : null}

      <Tabs
        label="My Table sections"
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            id: "perspectives",
            label: `My Takes (${beans.length})`,
            panel: (
              <Stack gap={16}>
                {showComposer || editingBean ? (
                  <QuickCaptureForm
                    key={editingBean?.id ?? "new"}
                    editingBean={editingBean}
                    existingOwnBeans={beans.map((b) => ({
                      id: b.id,
                      title: b.title,
                    }))}
                    onCancel={() => {
                      setShowComposer(false);
                      setEditingBean(null);
                    }}
                    onSaved={(saved) => {
                      setBeans((prev) => {
                        const exists = prev.some((b) => b.id === saved.id);
                        return exists
                          ? prev.map((b) => (b.id === saved.id ? saved : b))
                          : [saved, ...prev];
                      });
                      setShowComposer(false);
                      setEditingBean(null);
                      setStatusMessage(
                        `Saved "${saved.title}" (${saved.visibility}).`,
                      );
                    }}
                  />
                ) : (
                  <Surface className="cc-card-compact">
                    <div className="cc-row-between">
                      <Stack gap={2}>
                        <Text variant="body">
                          <strong>What did you just read or decide?</strong>
                        </Text>
                        <Text variant="help">
                          Capture a quick perspective in 10 seconds—private by default until you
                          choose to share it.
                        </Text>
                      </Stack>
                      <Button
                        emphasis="filled"
                        tone="brand"
                        size="compact"
                        onClick={() => setShowComposer(true)}
                      >
                        Capture a take
                      </Button>
                    </div>
                  </Surface>
                )}

                <div className="cc-row-between">
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <SearchField
                      label="Search your takes"
                      value={query}
                      onValueChange={setQuery}
                      placeholder="Filter by headline, trade-off, or tag"
                    />
                  </div>
                  <SegmentedControl
                    label="Visibility filter"
                    value={visFilter}
                    onValueChange={(v) =>
                      setVisFilter(v as "all" | "private" | "public")
                    }
                    options={[
                      { id: "all", label: `All (${beans.length})` },
                      { id: "private", label: `Private (${privateCount})` },
                      { id: "public", label: `Public (${publicCount})` },
                    ]}
                  />
                </div>

                {filteredBeans.length === 0 ? (
                  <EmptyResult
                    query={query}
                    onClear={() => {
                      setQuery("");
                      setVisFilter("all");
                    }}
                    empty="No perspectives here yet. Capture your first take above or right inside Claude / Codex."
                  />
                ) : (
                  <Stack gap={12}>
                    {filteredBeans.map((bean) => {
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
                                pending={busyId === bean.id}
                                onClick={() => handleToggleVisibility(bean)}
                              >
                                {bean.visibility === "public"
                                  ? "Make Private"
                                  : "Share Publicly"}
                              </Button>
                              <Button
                                emphasis="quiet"
                                size="compact"
                                onClick={() => {
                                  setEditingBean(bean);
                                  setShowComposer(false);
                                }}
                              >
                                Edit
                              </Button>
                              {bean.visibility === "public" && firstSource?.originId ? (
                                <Link href={`/sources/${firstSource.originId}`}>
                                  Shared Table →
                                </Link>
                              ) : null}
                              <Button
                                emphasis="quiet"
                                tone="danger"
                                size="compact"
                                disabled={busyId === bean.id}
                                onClick={() => setDeleteTarget(bean)}
                              >
                                Delete
                              </Button>
                            </>
                          }
                        />
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            ),
          },
          {
            id: "shelf",
            label: `Saved Voices (${shelf.length})`,
            panel: (
              <Stack gap={16}>
                <div className="cc-row-between">
                  <Stack gap={2}>
                    <Heading level={3}>Voices You Borrow From</Heading>
                    <Text variant="help">
                      Live references to other people&apos;s public takes. If they make a take
                      private or delete it, it leaves your shelf automatically.
                    </Text>
                  </Stack>
                  {shelf.length > 0 ? (
                    <Button
                      emphasis="filled"
                      tone="brand"
                      size="compact"
                      onClick={() => setHandoffOpen(true)}
                    >
                      Use Saved Voices in AI
                    </Button>
                  ) : null}
                </div>

                {shelf.length === 0 ? (
                  <EmptyResult empty="No saved voices yet. Explore Home or Tables and save perspectives you want your AI to reference." />
                ) : (
                  <Stack gap={8}>
                    {shelf.map((item) => (
                      <Surface key={item.id} className="cc-card-compact">
                        <div className="cc-row-between">
                          <Stack gap={2}>
                            {item.targetType === "person" && item.person ? (
                              <>
                                <Link href={`/@${item.person.handle}`}>
                                  <strong>{item.person.displayName}</strong> (@
                                  {item.person.handle})
                                </Link>
                                <Text variant="meta">
                                  {item.person.publicBeanCount} public takes referenced live
                                </Text>
                              </>
                            ) : item.bean ? (
                              <>
                                <Text variant="body">
                                  <strong>{item.bean.title}</strong>
                                </Text>
                                <Link href={`/@${item.bean.ownerHandle}`}>
                                  by @{item.bean.ownerHandle}
                                </Link>
                              </>
                            ) : null}
                          </Stack>
                          <Button
                            emphasis="quiet"
                            size="compact"
                            onClick={() => handleRemoveShelf(item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </Surface>
                    ))}
                  </Stack>
                )}
              </Stack>
            ),
          },
          {
            id: "settings",
            label: `AI & Settings${activeGrantsCount > 0 ? ` (${activeGrantsCount})` : ""}`,
            panel: (
              <Stack gap={24}>
                <Surface className="cc-card">
                  <Stack gap={12}>
                    <div className="cc-row-between">
                      <Stack gap={2}>
                        <Heading level={3}>Connected AI Hosts</Heading>
                        <Text variant="help">
                          Revoking access immediately invalidates both access and refresh tokens.
                        </Text>
                      </Stack>
                      <Link href="/connect">Connect another AI →</Link>
                    </div>

                    {grants.length === 0 ? (
                      <Text variant="help">
                        No AI hosts connected yet. Visit Use with AI for 30-second setup.
                      </Text>
                    ) : (
                      <Stack gap={8}>
                        {grants.map((grant) => (
                          <div key={grant.id} className="cc-muted-box">
                            <div className="cc-row-between">
                              <Stack gap={4}>
                                <Inline gap={8}>
                                  <Text variant="body">
                                    <strong>{grant.clientName}</strong>
                                  </Text>
                                  <Badge tone={grant.revokedAt ? "danger" : "success"}>
                                    {grant.revokedAt ? "Revoked" : "Active"}
                                  </Badge>
                                </Inline>
                                <Text variant="meta">
                                  Permissions: {grant.scopes.join(", ")}
                                </Text>
                              </Stack>
                              {!grant.revokedAt ? (
                                <Button
                                  emphasis="soft"
                                  tone="danger"
                                  size="compact"
                                  onClick={() => handleRevokeGrant(grant.id)}
                                >
                                  Revoke Access
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Surface>

                <Surface className="cc-card">
                  <Stack gap={12}>
                    <Heading level={3}>Export My Data</Heading>
                    <Text variant="help">
                      Download all of your confirmed perspectives, origins, and revision history
                      anytime.
                    </Text>
                    <Inline gap={12}>
                      <Link href="/api/export?format=json">
                        <Button emphasis="soft" size="compact">
                          Export JSON
                        </Button>
                      </Link>
                      <Link href="/api/export?format=markdown">
                        <Button emphasis="soft" size="compact">
                          Export Markdown
                        </Button>
                      </Link>
                    </Inline>
                  </Stack>
                </Surface>

                <Surface className="cc-card">
                  <Stack gap={12}>
                    <Heading level={3}>Linked Login Methods</Heading>
                    <Text variant="help">
                      You must keep at least one active login method linked to your account.
                    </Text>
                    <Stack gap={8}>
                      {accounts.map((acc) => (
                        <div key={acc.id} className="cc-muted-box">
                          <div className="cc-row-between">
                            <Inline gap={8}>
                              <Badge tone="neutral">{acc.providerId}</Badge>
                              <Text variant="meta">{acc.accountId}</Text>
                            </Inline>
                            <Button
                              emphasis="quiet"
                              tone="danger"
                              size="compact"
                              onClick={() => handleUnlinkAccount(acc.id)}
                            >
                              Unlink
                            </Button>
                          </div>
                        </div>
                      ))}
                    </Stack>
                  </Stack>
                </Surface>
              </Stack>
            ),
          },
        ]}
      />

      <Dialog
        open={Boolean(redactionBean)}
        onOpenChange={(open) => {
          if (!open) setRedactionBean(null);
        }}
        title="Quick privacy check before sharing"
        description="This perspective originated from a work decision."
      >
        {redactionBean ? (
          <Stack gap={16}>
            <Text variant="help">
              Confirm that &ldquo;{redactionBean.title}&rdquo; contains no company secrets, private
              code, or confidential customer details before showing it on your public page.
            </Text>
            <Checkbox
              label="I removed any private or confidential work details"
              checked={redactionChecked}
              onCheckedChange={(v) => setRedactionChecked(v === true)}
            />
            <Inline gap={8}>
              <Button
                emphasis="filled"
                tone="brand"
                disabled={!redactionChecked || busyId === redactionBean.id}
                onClick={() =>
                  executeVisibilityToggle(redactionBean, "public", true)
                }
              >
                Share Publicly
              </Button>
              <Button emphasis="quiet" onClick={() => setRedactionBean(null)}>
                Cancel
              </Button>
            </Inline>
          </Stack>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        pending={Boolean(deleteTarget && busyId === deleteTarget.id)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        decision={{
          id: deleteTarget?.id ?? "none",
          revision: String(deleteTarget?.version ?? 1),
          title: `Delete "${deleteTarget?.title ?? ""}"?`,
          consequence:
            "This permanently removes this perspective and its revisions. Anyone who saved it on their shelf will lose access immediately.",
          confirmLabel: "Delete permanently",
          available: Boolean(deleteTarget),
        }}
      />

      <AgentHandoffDialog
        open={handoffOpen}
        onOpenChange={setHandoffOpen}
        title="Use My Table in Your AI"
        description="Apply your own confirmed trade-offs (plus your Saved Voices) directly inside your AI host."
        workPrompt={
          shelfHandles
            ? `Use Coffee Chat (Work mode) with my own Beans plus my Saved Voices (${shelfHandles}) to review this task. Tell me clearly which perspective shaped each choice and flag any tensions.`
            : `Use Coffee Chat (Work mode) with my confirmed Beans to review this task. Show which trade-off shaped each choice and note any Bean withheld due to its boundary.`
        }
        talkPrompt={`Use Coffee Chat (Talk mode) to summarize my active trade-offs across my confirmed Beans, highlighting where my thinking has evolved or has deliberate tensions.`}
      />
    </Stack>
  );
}
