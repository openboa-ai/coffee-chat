"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Divider,
  EmptyResult,
  Heading,
  Inline,
  Link,
  Notice,
  SegmentedControl,
  Stack,
  Surface,
  Text,
  TextField,
  Textarea,
} from "@openboa/yogurt";
import {
  BeanCard,
  ConfirmBeanCard,
  type ConfirmBeanEdits,
  type UiBeanDetail,
  type UiPreparedBeanData,
} from "@coffee-chat/ui";

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
}

export function RoasteryClient({
  user,
  initialBeans,
  initialShelf,
  initialGrants,
  initialAccounts,
}: RoasteryClientProps) {
  const [beans, setBeans] = useState(initialBeans);
  const [shelf, setShelf] = useState(initialShelf);
  const [grants, setGrants] = useState(initialGrants);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Roast draft state
  const [showComposer, setShowComposer] = useState(false);
  const [originKind, setOriginKind] = useState<"source_excerpt" | "work_episode">(
    "source_excerpt",
  );
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTake, setDraftTake] = useState("");
  const [draftTradeoff, setDraftTradeoff] = useState("");
  const [draftBoundary, setDraftBoundary] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftQuote, setDraftQuote] = useState("");
  const [draftEpisode, setDraftEpisode] = useState("");
  const [prepared, setPrepared] = useState<UiPreparedBeanData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Explicit work_episode public redaction confirmation modal state
  const [redactionBean, setRedactionBean] = useState<UiBeanDetail | null>(null);
  const [redactionChecked, setRedactionChecked] = useState(false);

  const publicCount = beans.filter((b) => b.visibility === "public").length;
  const privateCount = beans.length - publicCount;

  const handlePrepare = async () => {
    setErrorMessage(null);
    setBusyId("prepare");
    try {
      const origins =
        originKind === "source_excerpt"
          ? [
              {
                kind: "source_excerpt",
                url: draftUrl,
                quotation: draftQuote || null,
              },
            ]
          : [
              {
                kind: "work_episode",
                episodeSummary: draftEpisode,
              },
            ];

      const res = await fetch("/api/beans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "prepare",
          input: {
            title: draftTitle,
            take: draftTake,
            tradeoff: draftTradeoff,
            boundary: draftBoundary,
            origins,
          },
        }),
      });
      const data = (await res.json()) as {
        prepared?: UiPreparedBeanData;
        message?: string;
      };
      if (!res.ok || !data.prepared) {
        throw new Error(data.message ?? "Could not prepare Bean.");
      }
      setPrepared(data.prepared);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Prepare failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmSave = async (edits: ConfirmBeanEdits) => {
    if (!prepared) return;
    setBusyId("save");
    setErrorMessage(null);
    try {
      const tags = edits.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const origins = prepared.canonicalPayload.origins.map((o) =>
        o.kind === "source_excerpt"
          ? {
              kind: "source_excerpt",
              url: o.url,
              sourceTitle: o.sourceTitle,
              quotation: o.quotation,
              locator: o.locator,
            }
          : {
              kind: "work_episode",
              episodeSummary: o.episodeSummary,
              locator: o.locator,
            },
      );

      // Re-prepare to keep server digest exact if user edited or toggled visibility.
      const prepRes = await fetch("/api/beans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "prepare",
          input: {
            title: edits.title,
            take: edits.take,
            tradeoff: edits.tradeoff,
            boundary: edits.boundary,
            uncertainty: edits.uncertainty || null,
            tags,
            visibility: edits.visibility,
            origins,
          },
        }),
      });
      const prepData = (await prepRes.json()) as {
        prepared?: UiPreparedBeanData;
        message?: string;
      };
      if (!prepRes.ok || !prepData.prepared) {
        throw new Error(prepData.message ?? "Re-prepare failed.");
      }

      const saveRes = await fetch("/api/beans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...prepData.prepared.canonicalPayload,
          digest: prepData.prepared.digest,
          operationKey: prepData.prepared.operationKey,
          attestationKind: "ui_attested",
          redactionConfirmed: edits.redactionConfirmed,
        }),
      });
      const saveData = (await saveRes.json()) as {
        bean?: UiBeanDetail;
        message?: string;
      };
      if (!saveRes.ok || !saveData.bean) {
        throw new Error(saveData.message ?? "Save failed.");
      }

      setBeans((prev) => [saveData.bean!, ...prev]);
      setPrepared(null);
      setShowComposer(false);
      setOriginKind("source_excerpt");
      setDraftTitle("");
      setDraftTake("");
      setDraftTradeoff("");
      setDraftBoundary("");
      setDraftUrl("");
      setDraftQuote("");
      setDraftEpisode("");
      setStatusMessage(`Saved "${saveData.bean.title}" (${saveData.bean.visibility}).`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusyId(null);
    }
  };

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
        throw new Error(data.message ?? "Visibility update failed.");
      }
      setBeans((prev) => prev.map((b) => (b.id === bean.id ? data.bean! : b)));
      setRedactionBean(null);
      setRedactionChecked(false);
      setStatusMessage(
        `Updated "${data.bean.title}" to ${data.bean.visibility} (v${data.bean.version}).`,
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

  const handleDeleteBean = async (bean: UiBeanDetail) => {
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
      setStatusMessage("Revoked OAuth grant and invalidated all access/refresh tokens.");
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

  return (
    <Stack gap={24}>
      <div className="cc-row-between">
        <Stack gap={4}>
          <Heading level={1}>My Roastery</Heading>
          <Text variant="help">
            {user.name} (@{user.handle}) · {publicCount} public · {privateCount} private
          </Text>
        </Stack>
        <Inline gap={8}>
          <Link href={`/@${user.handle}`}>View Public Page</Link>
          <Button
            emphasis="filled"
            tone="brand"
            onClick={() => {
              setShowComposer((v) => !v);
              setPrepared(null);
            }}
          >
            {showComposer ? "Close Composer" : "New Confirmed Bean"}
          </Button>
        </Inline>
      </div>

      {statusMessage ? (
        <Notice title="Updated" tone="success">
          {statusMessage}
        </Notice>
      ) : null}

      {errorMessage ? (
        <Notice title="Action failed" tone="danger">
          {errorMessage}
        </Notice>
      ) : null}

      {redactionBean ? (
        <Surface className="cc-card">
          <Stack gap={12}>
            <Heading level={3}>Confirm work-episode redaction before publishing</Heading>
            <Text variant="help">
              &ldquo;{redactionBean.title}&rdquo; originated from a work episode. Confirm that no
              private code, proprietary names, or confidential data remain.
            </Text>
            <Checkbox
              label="I verified this Bean contains no private or proprietary information"
              checked={redactionChecked}
              onCheckedChange={(v) => setRedactionChecked(v === true)}
            />
            <Inline gap={8}>
              <Button
                emphasis="filled"
                tone="brand"
                disabled={!redactionChecked || busyId === redactionBean.id}
                onClick={() => executeVisibilityToggle(redactionBean, "public", true)}
              >
                Publish Bean
              </Button>
              <Button emphasis="quiet" onClick={() => setRedactionBean(null)}>
                Cancel
              </Button>
            </Inline>
          </Stack>
        </Surface>
      ) : null}

      {showComposer ? (
        prepared ? (
          <ConfirmBeanCard
            prepared={prepared}
            saving={busyId === "save"}
            onConfirm={handleConfirmSave}
            onCancel={() => setPrepared(null)}
          />
        ) : (
          <Surface className="cc-card">
            <Stack gap={12}>
              <Heading level={3}>Draft a perspective candidate</Heading>
              <SegmentedControl
                label="Origin kind"
                value={originKind}
                onValueChange={(v) =>
                  setOriginKind(v as "source_excerpt" | "work_episode")
                }
                options={[
                  { id: "source_excerpt", label: "Source URL Excerpt" },
                  { id: "work_episode", label: "Work Decision / Correction" },
                ]}
              />
              <TextField
                label="Title"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="e.g. Prefer reversible small probes"
              />
              <Textarea
                label="Take"
                value={draftTake}
                onChange={(e) => setDraftTake(e.target.value)}
                rows={2}
              />
              <Textarea
                label="Priority & Trade-off"
                value={draftTradeoff}
                onChange={(e) => setDraftTradeoff(e.target.value)}
                rows={2}
              />
              <Textarea
                label="Boundary"
                value={draftBoundary}
                onChange={(e) => setDraftBoundary(e.target.value)}
                rows={2}
              />
              {originKind === "source_excerpt" ? (
                <>
                  <TextField
                    label="Source URL"
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)}
                    placeholder="https://example.com/article"
                  />
                  <TextField
                    label="Selected quotation (optional)"
                    value={draftQuote}
                    onChange={(e) => setDraftQuote(e.target.value)}
                  />
                </>
              ) : (
                <Textarea
                  label="Work episode summary (no secrets or private code)"
                  value={draftEpisode}
                  onChange={(e) => setDraftEpisode(e.target.value)}
                  rows={2}
                />
              )}
              <div>
                <Button
                  emphasis="filled"
                  tone="brand"
                  pending={busyId === "prepare"}
                  onClick={handlePrepare}
                >
                  Prepare Confirmation Card
                </Button>
              </div>
            </Stack>
          </Surface>
        )
      ) : null}

      <Stack gap={12}>
        <div className="cc-row-between">
          <Heading level={2}>Confirmed Beans ({beans.length})</Heading>
          <Inline gap={8}>
            <Link href="/api/export?format=json">Export JSON</Link>
            <Link href="/api/export?format=markdown">Export Markdown</Link>
          </Inline>
        </div>

        {beans.length === 0 ? (
          <EmptyResult empty="No confirmed Beans yet. Roast from your agent host or create one above." />
        ) : (
          <Stack gap={12}>
            {beans.map((bean) => (
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
                      {bean.visibility === "public" ? "Make Private" : "Make Public"}
                    </Button>
                    <Button
                      emphasis="quiet"
                      tone="danger"
                      size="compact"
                      disabled={busyId === bean.id}
                      onClick={() => handleDeleteBean(bean)}
                    >
                      Delete
                    </Button>
                  </>
                }
              />
            ))}
          </Stack>
        )}
      </Stack>

      <Divider />

      <Stack gap={12}>
        <Heading level={2}>Borrowed Shelf ({shelf.length})</Heading>
        {shelf.length === 0 ? (
          <Text variant="help">
            Save public Beans or authors from Person Pages to reference them in Brew without copying
            ownership.
          </Text>
        ) : (
          <Stack gap={8}>
            {shelf.map((item) => (
              <Surface key={item.id} className="cc-card">
                <div className="cc-row-between">
                  <Stack gap={2}>
                    {item.targetType === "person" && item.person ? (
                      <>
                        <Link href={`/@${item.person.handle}`}>
                          <strong>{item.person.displayName}</strong> (@{item.person.handle})
                        </Link>
                        <Text variant="meta">
                          {item.person.publicBeanCount} public Beans referenced live
                        </Text>
                      </>
                    ) : item.bean ? (
                      <>
                        <Text variant="body">
                          <strong>{item.bean.title}</strong>
                        </Text>
                        <Text variant="meta">by @{item.bean.ownerHandle}</Text>
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

      <Divider />

      <Stack gap={12}>
        <Heading level={2}>Connected Agent Grants (OAuth 2.1 MCP)</Heading>
        {grants.length === 0 ? (
          <Text variant="help">No connected MCP clients yet.</Text>
        ) : (
          <Stack gap={8}>
            {grants.map((grant) => (
              <Surface key={grant.id} className="cc-card">
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
                    <Text variant="meta">Scopes: {grant.scopes.join(", ")}</Text>
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
              </Surface>
            ))}
          </Stack>
        )}
      </Stack>

      <Divider />

      <Stack gap={12}>
        <Heading level={2}>Linked Login Methods</Heading>
        <Stack gap={8}>
          {accounts.map((acc) => (
            <Surface key={acc.id} className="cc-card">
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
            </Surface>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
