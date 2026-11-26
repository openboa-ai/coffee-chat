"use client";

import { useState } from "react";
import { ProjectMark } from "@openboa/yogurt/project-mark";

type ChatScenario = "decide" | "roast" | "chat";

const SCENARIO_TABS: Array<{
  id: ChatScenario;
  label: string;
  threadTitle: string;
  threadMeta: string;
}> = [
  {
    id: "decide",
    label: "Ask a hard call",
    threadTitle: "Ops Lead finalist decision",
    threadMeta: "Your Taste applied",
  },
  {
    id: "roast",
    label: "Correct once & Roast",
    threadTitle: "Q3 board deck rewrite",
    threadMeta: "Inline Confirm Gate",
  },
  {
    id: "chat",
    label: "Coffee Chat with @claire",
    threadTitle: "Launch timing · @claire",
    threadMeta: "Attributed Beans",
  },
];

function AgentSparkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.2L9.7 6.3L14.8 8L9.7 9.7L8 14.8L6.3 9.7L1.2 8L6.3 6.3Z" />
    </svg>
  );
}

function CopyGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5V9A1.5 1.5 0 0 0 3.5 10.5H5.5" />
    </svg>
  );
}

export interface RealAiChatSessionProps {
  onCopyStarter?: () => void;
  copied?: boolean;
}

/**
 * Authentic, realistic Agent chat interface preview showing visitors exactly
 * what using Coffee Chat inside their everyday Agents looks and feels like.
 */
export function RealAiChatSession({
  onCopyStarter,
  copied = false,
}: RealAiChatSessionProps) {
  const [scenario, setScenario] = useState<ChatScenario>("decide");
  const [tastePlugged, setTastePlugged] = useState(true);
  const [beanSaved, setBeanSaved] = useState(false);
  const [showDavidContrast, setShowDavidContrast] = useState(false);

  const privateBeanCount = beanSaved ? 5 : 4;

  const userPrompt =
    scenario === "decide"
      ? "Two finalists for Operations Lead: a super fast learner from another industry, or a 10-year veteran who already knows our exact playbook. Who should we hire?"
      : scenario === "roast"
        ? "Wait—don’t bury the missed Q3 target on slide 4. Put the honest status and our recovery plan in the very first sentence."
        : "Have a Coffee Chat with @claire—should we spend another month polishing this launch, or show a rough draft to 10 customers this week?";

  const composerPlaceholder =
    scenario === "decide"
      ? "Ask a follow-up or test another trade-off…"
      : scenario === "roast"
        ? "Push back on anything to Roast another private Bean…"
        : showDavidContrast
          ? "Ask how your own Taste balances @claire and @david…"
          : "Try “Now contrast @claire with @david on this launch”…";

  const footerCitation =
    scenario === "decide"
      ? tastePlugged
        ? "1 private Bean cited · Growth Roast"
        : "Default Agent · No Beans applied"
      : scenario === "roast"
        ? beanSaved
          ? "Saved privately · My Roastery"
          : "Pending your confirmation"
        : showDavidContrast
          ? "2 public Beans contrasted · @claire & @david"
          : "Attributed to @claire · Public Beans";

  return (
    <div className="cc-gpt-section">
      {/* Header + Unified Pill Scenario Segmented Bar */}
      <div className="cc-gpt-head">
        <div className="cc-gpt-head-copy">
          <span className="cc-kicker-ink">Inside your Agents</span>
          <h2 className="cc-editorial-h2">How it feels inside your Agents.</h2>
          <p className="cc-gpt-sub">
            No new app to switch to. Connect once, then talk to your Agents the
            exact way you already do.
          </p>
        </div>

        <div
          className="cc-gpt-pill-bar"
          role="tablist"
          aria-label="Real Agent chat examples"
        >
          {SCENARIO_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={scenario === tab.id}
              className="cc-gpt-pill-tab"
              data-active={scenario === tab.id}
              onClick={() => setScenario(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Authentic Agent Chat Window Frame */}
      <div className="cc-gpt-shell">
        {/* Clickable Left Thread History Rail (Desktop) */}
        <aside className="cc-gpt-sidebar" aria-label="Example Agent threads">
          <div className="cc-gpt-sidebar-top">
            <span className="cc-gpt-win-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="cc-gpt-app-name">Agent</span>
          </div>

          <div className="cc-gpt-sidebar-group">
            <span className="cc-gpt-sidebar-label">Today</span>
            {SCENARIO_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="cc-gpt-thread-item"
                data-active={scenario === tab.id}
                aria-current={scenario === tab.id ? "true" : undefined}
                onClick={() => setScenario(tab.id)}
              >
                <span className="cc-gpt-thread-title">{tab.threadTitle}</span>
                <span className="cc-gpt-thread-meta">{tab.threadMeta}</span>
              </button>
            ))}
          </div>

          <div
            className="cc-gpt-connector-pill"
            data-on={scenario !== "decide" || tastePlugged}
          >
            <ProjectMark project="coffee" label="" size={18} />
            <div>
              <strong>Coffee Chat</strong>
              <span>
                {scenario === "decide" && !tastePlugged
                  ? "Paused · Default Agent"
                  : `Connected · ${privateBeanCount} private Beans`}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Realistic Chat Thread */}
        <div className="cc-gpt-main">
          {/* Top Thread Header with Live Coffee Chat ON/OFF toggle on Scenario 1 */}
          <div className="cc-gpt-topbar">
            <div className="cc-gpt-model-label">
              <span>Your Agent</span>
              <span
                className="cc-gpt-connector-dot"
                data-on={scenario !== "decide" || tastePlugged}
              >
                <i aria-hidden="true" />
                {scenario === "decide" && !tastePlugged
                  ? "Coffee Chat off"
                  : "Coffee Chat connected"}
              </span>
            </div>

            {scenario === "decide" ? (
              <div
                className="cc-gpt-toggle-group"
                role="radiogroup"
                aria-label="Toggle Coffee Chat inside your Agent"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={tastePlugged}
                  className="cc-gpt-toggle-btn"
                  data-active={tastePlugged}
                  onClick={() => setTastePlugged(true)}
                >
                  With your Taste
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!tastePlugged}
                  className="cc-gpt-toggle-btn"
                  data-active={!tastePlugged}
                  onClick={() => setTastePlugged(false)}
                >
                  Without Taste (Default)
                </button>
              </div>
            ) : (
              <span className="cc-gpt-topbar-hint">
                {scenario === "roast"
                  ? "MCP Confirm Widget · Private"
                  : "Public Beans · Attributed"}
              </span>
            )}
          </div>

          {/* Conversation Body */}
          <div className="cc-gpt-thread" key={`${scenario}-${tastePlugged}`}>
            {/* User Turn (Right-aligned rounded bubble) */}
            <div className="cc-gpt-msg-user">
              <p>{userPrompt}</p>
            </div>

            {/* Agent Turn (Left-aligned clean prose + inline MCP trace + realistic action bar) */}
            <div className="cc-gpt-msg-ai">
              <div className="cc-gpt-ai-avatar" aria-hidden="true">
                <AgentSparkIcon />
              </div>

              <div className="cc-gpt-ai-body">
                {/* Inline Tool/MCP Trace Pill */}
                {scenario === "decide" && !tastePlugged ? null : (
                  <div className="cc-gpt-trace">
                    <ProjectMark project="coffee" label="" size={15} />
                    <span>
                      {scenario === "decide"
                        ? "Coffee Chat · Applied your private Bean “Hire fast learners over ready-made playbooks”"
                        : scenario === "roast"
                          ? "Coffee Chat · Drafted a private Bean from your correction — awaiting confirmation"
                          : "Coffee Chat · Read @claire’s confirmed public Beans (attributed, never roleplayed)"}
                    </span>
                  </div>
                )}

                {/* Scenario 1: Decide (With Taste vs Without Taste) */}
                {scenario === "decide" ? (
                  tastePlugged ? (
                    <div className="cc-gpt-prose">
                      <p className="cc-gpt-prose-lead">
                        <strong>Go with the fast learner</strong> and pair them
                        with a clear 30-day ramp milestone.
                      </p>
                      <ul className="cc-gpt-list">
                        <li>
                          <strong>Why this fits your Taste:</strong> Your
                          confirmed Growth Roast Bean puts ownership and
                          learning speed ahead of exact prior playbooks.
                        </li>
                        <li>
                          <strong>Boundary check:</strong> Your rule flips only
                          if the role requires day-1 regulatory certification.
                          If it doesn’t, the generalist is your call.
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <div className="cc-gpt-prose cc-gpt-prose-muted">
                      <p className="cc-gpt-prose-lead">
                        Both candidates have strong advantages depending on your
                        team’s current priorities:
                      </p>
                      <ul className="cc-gpt-list">
                        <li>
                          <strong>Fast learner:</strong> Offers adaptability and
                          long-term upside, though onboarding may take longer.
                        </li>
                        <li>
                          <strong>10-year veteran:</strong> Brings immediate
                          familiarity with existing processes, though they may
                          be less flexible.
                        </li>
                      </ul>
                      <p>
                        Ultimately, it depends on whether you prioritize
                        short-term speed or long-term growth.
                      </p>
                    </div>
                  )
                ) : null}

                {/* Scenario 2: Roast Inline Confirm Widget */}
                {scenario === "roast" ? (
                  <div className="cc-gpt-prose">
                    <p className="cc-gpt-prose-lead">
                      Done—moved the missed Q3 target and recovery plan into
                      sentence 1 of slide 1. Want to save this rule so I follow
                      it automatically next time?
                    </p>

                    <div
                      className="cc-gpt-confirm-widget"
                      data-saved={beanSaved}
                    >
                      <div className="cc-gpt-widget-head">
                        <span className="cc-gpt-widget-kicker">
                          <ProjectMark project="coffee" label="" size={15} />
                          <span>Confirm Bean · Private by default</span>
                        </span>
                        <span className="cc-gpt-widget-status">
                          {beanSaved ? "Saved ✓" : "Waiting for you"}
                        </span>
                      </div>

                      <p className="cc-gpt-widget-title">
                        Lead with the hard truth, not the build-up
                      </p>

                      <div className="cc-gpt-widget-meta">
                        <div>
                          <span>What mattered more</span>
                          <strong>
                            Upfront trust and clarity over softening the moment
                          </strong>
                        </div>
                        <div>
                          <span>Except when</span>
                          <strong>
                            External notes needing legal review first
                          </strong>
                        </div>
                      </div>

                      <div className="cc-gpt-widget-foot">
                        <button
                          type="button"
                          className="cc-gpt-confirm-btn"
                          data-saved={beanSaved}
                          onClick={() => setBeanSaved((v) => !v)}
                        >
                          {beanSaved
                            ? "Saved privately to My Roastery ✓"
                            : "Confirm & Save Bean"}
                        </button>
                        <span>Nothing saves without your click</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Scenario 3: Coffee Chat with @claire + live clickable @david contrast */}
                {scenario === "chat" ? (
                  <div className="cc-gpt-prose">
                    <p className="cc-gpt-prose-lead">
                      <strong>Based on @claire’s Beans,</strong> show an honest,
                      clearly labeled draft to 10 customers this week.
                    </p>
                    <ul className="cc-gpt-list">
                      <li>
                        <strong>@claire’s priority:</strong> Real customer
                        signal beats upfront perfection—polishing the wrong
                        workflow wastes a month.
                      </li>
                      <li>
                        <strong>Where @claire’s rule stops:</strong> Public
                        brand launches or irreversible commitments. Keep this
                        early test invite-only and reversible.
                      </li>
                    </ul>

                    {!showDavidContrast ? (
                      <div className="cc-gpt-followup-row">
                        <button
                          type="button"
                          className="cc-gpt-followup-chip"
                          onClick={() => setShowDavidContrast(true)}
                        >
                          Now contrast with @david’s Beans →
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Realistic Agent Turn Action Bar */}
                <div className="cc-gpt-turn-actions">
                  <span className="cc-gpt-turn-cite">
                    <ProjectMark project="coffee" label="" size={13} />
                    <span>{footerCitation}</span>
                  </span>
                  {onCopyStarter ? (
                    <button
                      type="button"
                      className="cc-gpt-turn-icon-btn"
                      onClick={onCopyStarter}
                      aria-label="Copy starter prompt"
                      title="Copy starter prompt"
                    >
                      <CopyGlyph />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Live Expanded Follow-Up Contrast Turn inside Scenario 3 */}
            {scenario === "chat" && showDavidContrast ? (
              <div className="cc-gpt-contrast-turn">
                <div className="cc-gpt-msg-user">
                  <p>Contrast this with @david’s Beans on day-1 trust.</p>
                </div>

                <div className="cc-gpt-msg-ai">
                  <div className="cc-gpt-ai-avatar" aria-hidden="true">
                    <AgentSparkIcon />
                  </div>
                  <div className="cc-gpt-ai-body">
                    <div className="cc-gpt-trace">
                      <ProjectMark project="coffee" label="" size={15} />
                      <span>
                        Coffee Chat · Contrasted @claire vs @david on launch
                        trust
                      </span>
                    </div>
                    <div className="cc-gpt-prose">
                      <p className="cc-gpt-prose-lead">
                        <strong>Based on @david’s Beans,</strong> run that
                        10-customer preview on sample data first—never expose
                        live customer billing or account state to an unpolished
                        flow.
                      </p>
                      <div className="cc-gpt-followup-row">
                        <button
                          type="button"
                          className="cc-gpt-followup-chip"
                          onClick={() => setShowDavidContrast(false)}
                        >
                          Reset contrast
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Authentic Bottom Chat Composer Bar */}
          <div className="cc-gpt-composer">
            <span className="cc-gpt-composer-input">{composerPlaceholder}</span>
            <div className="cc-gpt-composer-right">
              <span className="cc-gpt-composer-chip">
                <ProjectMark project="coffee" label="" size={14} />
                <span>MCP</span>
              </span>
              {onCopyStarter ? (
                <button
                  type="button"
                  className="cc-gpt-send-btn"
                  onClick={onCopyStarter}
                >
                  {copied ? "Prompt copied ✓" : "Copy starter prompt"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
