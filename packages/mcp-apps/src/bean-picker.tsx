import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import { Notice } from "@openboa/yogurt/notice";
import { Yogurt } from "@openboa/yogurt/yogurt";
import { BeanPicker, type UiBeanSummary } from "@coffee-chat/ui";

function BeanPickerApp() {
  const [beans, setBeans] = useState<UiBeanSummary[]>(
    () => window.__COFFEE_CHAT_INITIAL_RESULT__?.structuredContent?.beans ?? [],
  );
  const [reason, setReason] = useState<string | undefined>(
    () => window.__COFFEE_CHAT_INITIAL_RESULT__?.structuredContent?.reason,
  );
  const [appearance, setAppearance] = useState<"auto" | "light" | "dark">("auto");
  const [appliedCount, setAppliedCount] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const appRef = useRef<App | null>(null);

  useEffect(() => {
    const app = new App({ name: "Coffee Chat Bean Picker", version: "0.1.0" }, {});
    appRef.current = app;

    app.ontoolresult = (result) => {
      const sc = result.structuredContent as
        | { beans?: UiBeanSummary[]; reason?: string }
        | undefined;
      if (sc?.beans) {
        setBeans(sc.beans);
        setReason(sc.reason);
        setAppliedCount(null);
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

  const handleApply = async (selected: UiBeanSummary[]) => {
    setApplying(true);
    try {
      if (window.__COFFEE_CHAT_ON_PICK__) {
        window.__COFFEE_CHAT_ON_PICK__(selected);
      } else {
        const app = appRef.current;
        const summaryText =
          "Apply these confirmed Coffee Chat Beans to the current task:\n" +
          selected
            .map((b) => `- ${b.title} (id=${b.id}, @${b.ownerHandle})`)
            .join("\n");
        const caps = app?.getHostCapabilities();
        if (app && caps?.updateModelContext) {
          await app.updateModelContext({
            content: [{ type: "text", text: summaryText }],
          });
        } else if (app && caps?.message) {
          await app.sendMessage({
            role: "user",
            content: [{ type: "text", text: summaryText }],
          });
        }
      }
      setAppliedCount(selected.length);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Yogurt appearance={appearance} material="neutral" className="app-widget-frame">
      {appliedCount !== null ? (
        <Notice title="Perspectives attached" tone="success">
          Selected {appliedCount} confirmed perspective(s) for Brew.
        </Notice>
      ) : (
        <BeanPicker
          beans={beans}
          reason={reason}
          applying={applying}
          onApply={handleApply}
        />
      )}
    </Yogurt>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<BeanPickerApp />);
}
