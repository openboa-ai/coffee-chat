import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import { Yogurt } from "@openboa/yogurt/yogurt";
import { PerspectiveDiffCard, type UiBeanDetail } from "@coffee-chat/ui";

function PerspectiveDiffApp() {
  const [subject, setSubject] = useState(
    () =>
      window.__COFFEE_CHAT_INITIAL_RESULT__?.structuredContent?.subject ??
      "Confirmed Perspectives",
  );
  const [perspectives, setPerspectives] = useState<UiBeanDetail[]>(
    () =>
      window.__COFFEE_CHAT_INITIAL_RESULT__?.structuredContent?.perspectives ??
      [],
  );
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [appearance, setAppearance] = useState<"auto" | "light" | "dark">("auto");
  const appRef = useRef<App | null>(null);

  useEffect(() => {
    const app = new App(
      { name: "Coffee Chat Perspective Diff", version: "0.1.0" },
      {},
    );
    appRef.current = app;

    app.ontoolresult = (result) => {
      const sc = result.structuredContent as
        | { subject?: string; perspectives?: UiBeanDetail[] }
        | undefined;
      if (sc?.perspectives) {
        setSubject(sc.subject ?? "Confirmed Perspectives");
        setPerspectives(sc.perspectives);
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
        .catch(() => {});
    }
  }, []);

  const handleSaveToShelf = async (bean: UiBeanDetail) => {
    if (window.__COFFEE_CHAT_MOCK_TOOL_CALL__) {
      await window.__COFFEE_CHAT_MOCK_TOOL_CALL__("manage_shelf", {
        action: "add",
        targetType: "bean",
        beanId: bean.id,
      });
      setSavedIds((prev) => [...prev, bean.id]);
      return;
    }
    const app = appRef.current;
    if (app) {
      await app.callServerTool({
        name: "manage_shelf",
        arguments: { action: "add", targetType: "bean", beanId: bean.id },
      });
      setSavedIds((prev) => [...prev, bean.id]);
    }
  };

  const handleOpenUrl = async (url: string) => {
    const app = appRef.current;
    if (app && app.getHostCapabilities()?.openLinks) {
      await app.openLink({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Yogurt appearance={appearance} material="neutral" className="app-widget-frame">
      <PerspectiveDiffCard
        subject={subject}
        perspectives={perspectives}
        savedIds={savedIds}
        onSaveToShelf={handleSaveToShelf}
        onOpenUrl={handleOpenUrl}
      />
    </Yogurt>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<PerspectiveDiffApp />);
}
