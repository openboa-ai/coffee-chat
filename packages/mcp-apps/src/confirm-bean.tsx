import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import { Notice, Yogurt } from "@openboa/yogurt";
import type {
  ConfirmBeanEdits,
  UiPreparedBeanData,
  UiVisibility,
} from "@coffee-chat/ui";
import { ConfirmBeanCard } from "@coffee-chat/ui";

function ConfirmBeanApp() {
  const [prepared, setPrepared] = useState<UiPreparedBeanData | null>(
    () => window.__COFFEE_CHAT_INITIAL_RESULT__?.structuredContent?.prepared ?? null,
  );
  const [appearance, setAppearance] = useState<"auto" | "light" | "dark">("auto");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<{
    beanId: string;
    version: number;
    visibility: UiVisibility;
  } | null>(null);
  const appRef = useRef<App | null>(null);

  useEffect(() => {
    const app = new App({ name: "Coffee Chat Confirm Bean", version: "0.1.0" }, {});
    appRef.current = app;

    // Register handlers BEFORE connect() per MCP Apps lifecycle contract.
    app.ontoolinput = () => {
      setError(null);
    };
    app.ontoolresult = (result) => {
      const sc = result.structuredContent as
        | { prepared?: UiPreparedBeanData }
        | undefined;
      if (sc?.prepared) {
        setPrepared(sc.prepared);
        setCancelled(false);
        setSavedReceipt(null);
      }
    };
    app.onhostcontextchanged = (ctx) => {
      if (ctx.theme) {
        applyDocumentTheme(ctx.theme);
        setAppearance(ctx.theme === "dark" ? "dark" : "light");
      }
      if (ctx.styles?.variables) {
        applyHostStyleVariables(ctx.styles.variables);
      }
    };

    if (!window.__COFFEE_CHAT_INITIAL_RESULT__) {
      app
        .connect()
        .then(() => {
          const ctx = app.getHostContext();
          if (ctx?.theme) {
            applyDocumentTheme(ctx.theme);
            setAppearance(ctx.theme === "dark" ? "dark" : "light");
          }
          if (ctx?.styles?.variables) {
            applyHostStyleVariables(ctx.styles.variables);
          }
        })
        .catch(() => {
          // Standalone preview mode without MCP host bridge.
        });
    }
  }, []);

  const callTool = async (name: string, args: Record<string, unknown>) => {
    if (window.__COFFEE_CHAT_MOCK_TOOL_CALL__) {
      return window.__COFFEE_CHAT_MOCK_TOOL_CALL__(name, args);
    }
    const app = appRef.current;
    if (!app) throw new Error("MCP App bridge is not connected.");
    return app.callServerTool({ name, arguments: args });
  };

  const handleConfirm = async (edits: ConfirmBeanEdits) => {
    if (!prepared) return;
    setSaving(true);
    setError(null);
    try {
      const tags = edits.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const origins = prepared.canonicalPayload.origins.map((o) =>
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

      // Re-prepare on the server whenever the user edited fields or toggled visibility
      // so the server computes the exact canonical RFC 8785 JCS digest.
      const unchanged =
        edits.title === prepared.canonicalPayload.title &&
        edits.take === prepared.canonicalPayload.take &&
        edits.tradeoff === prepared.canonicalPayload.tradeoff &&
        edits.boundary === prepared.canonicalPayload.boundary &&
        (edits.uncertainty || null) === prepared.canonicalPayload.uncertainty &&
        edits.visibility === prepared.canonicalPayload.visibility &&
        JSON.stringify(tags) === JSON.stringify(prepared.canonicalPayload.tags);

      let activePrepared = prepared;
      if (!unchanged) {
        const rePrep = await callTool("prepare_bean", {
          beanId: prepared.canonicalPayload.beanId,
          expectedVersion: prepared.canonicalPayload.expectedVersion,
          title: edits.title,
          take: edits.take,
          tradeoff: edits.tradeoff,
          boundary: edits.boundary,
          uncertainty: edits.uncertainty || null,
          tags,
          visibility: edits.visibility,
          origins,
          relations: prepared.canonicalPayload.relations,
        });
        const reSc = rePrep.structuredContent as
          | { prepared?: UiPreparedBeanData; error?: string }
          | undefined;
        if (rePrep.isError || !reSc?.prepared) {
          throw new Error(reSc?.error ?? "Failed to re-prepare edited Bean.");
        }
        activePrepared = reSc.prepared;
        setPrepared(activePrepared);
      }

      const saveRes = await callTool("save_bean", {
        ...activePrepared.canonicalPayload,
        digest: activePrepared.digest,
        operationKey: activePrepared.operationKey,
        attestationKind: "ui_attested",
        redactionConfirmed: edits.redactionConfirmed,
      });

      const saveSc = saveRes.structuredContent as
        | {
            bean?: { id: string; version: number; visibility: UiVisibility };
            error?: string;
          }
        | undefined;
      if (saveRes.isError || !saveSc?.bean) {
        throw new Error(saveSc?.error ?? "Failed to save Bean.");
      }

      setSavedReceipt({
        beanId: saveSc.bean.id,
        version: saveSc.bean.version,
        visibility: saveSc.bean.visibility,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Bean.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Yogurt appearance={appearance} material="neutral" className="cc-widget-frame">
      {cancelled ? (
        <Notice title="Cancelled" tone="neutral">
          No Bean was saved. You can keep editing in conversation or dismiss this card.
        </Notice>
      ) : prepared ? (
        <ConfirmBeanCard
          prepared={prepared}
          saving={saving}
          savedReceipt={savedReceipt}
          error={error}
          onConfirm={handleConfirm}
          onCancel={() => setCancelled(true)}
        />
      ) : (
        <Notice title="Waiting for candidate perspective" tone="neutral">
          Preparing Roast confirmation card…
        </Notice>
      )}
    </Yogurt>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<ConfirmBeanApp />);
}
