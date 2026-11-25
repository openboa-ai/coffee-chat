"use client";

import type { ReactNode } from "react";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Chart } from "@openboa/yogurt/chart";
import { Divider } from "@openboa/yogurt/divider";
import { EmptyResult } from "@openboa/yogurt/empty-result";
import { Inline } from "@openboa/yogurt/inline";
import { RecordFacts } from "@openboa/yogurt/record-facts";
import { Stack } from "@openboa/yogurt/stack";
import { Text } from "@openboa/yogurt/text";
import { PageHeader } from "@openboa/yogurt/top";
import type { PersonalInsightsView } from "@coffee-chat/core";

export interface InsightsPanelProps {
  insights: PersonalInsightsView;
  leading?: ReactNode;
  onSelectDomain: (tag: string) => void;
  onSelectLifecycle: (state: "active" | "in_tension" | "superseded") => void;
  onOpenConnect: () => void;
}

export function InsightsPanel({
  insights,
  leading,
  onSelectDomain,
  onSelectLifecycle,
  onOpenConnect,
}: InsightsPanelProps) {
  const maxTagCount = insights.topTags[0]?.count ?? 1;
  const asOfLabel = new Date(insights.asOf).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Deterministic editorial reflections computed strictly from PersonalInsightsView (zero server AI)
  const reflections: Array<{
    id: string;
    text: string;
    actionLabel?: string;
    onAction?: () => void;
  }> = [];

  if (insights.totalCount === 0) {
    reflections.push({
      id: "empty",
      text: "Your cup is empty—Roast your first Bean from a link or work call to start mapping your Taste.",
    });
  } else {
    if (insights.lifecycle.inTensionCount > 0) {
      reflections.push({
        id: "tension",
        text: `${insights.lifecycle.inTensionCount} ${insights.lifecycle.inTensionCount === 1 ? "Bean is" : "Beans are"} in tension—reconciling them clarifies which trade-off should lead when your AI brews.`,
        actionLabel: "Review tension",
        onAction: () => onSelectLifecycle("in_tension"),
      });
    }
    if (
      insights.originMix.readingCount > 0 &&
      insights.originMix.workCount === 0
    ) {
      reflections.push({
        id: "reading-heavy",
        text: "All of your Beans came from reading so far—capture one real work call to ground theory in practice.",
      });
    } else if (
      insights.originMix.workCount > 0 &&
      insights.originMix.readingCount === 0
    ) {
      reflections.push({
        id: "work-heavy",
        text: "Every Bean came from live work calls—Roast a reading takeaway to start a Table and compare with other voices.",
      });
    }
    if (insights.publicCount === 0 && insights.privateCount > 0) {
      reflections.push({
        id: "all-private",
        text: "All your Beans are still Private—whenever one feels crisp, put it On the Table to invite contrasting takes.",
      });
    }
  }

  if (insights.activeGrantCount === 0) {
    reflections.push({
      id: "brew-bar",
      text: "Brew Bar isn't linked yet—connect your AI host once so these confirmed criteria actually shape daily answers.",
      actionLabel: "Open Brew Bar",
      onAction: onOpenConnect,
    });
  } else if (
    insights.totalCount > 0 &&
    insights.lifecycle.inTensionCount === 0
  ) {
    reflections.push({
      id: "brew-ready",
      text: `Brew Ready—${insights.lifecycle.activeCount} active ${insights.lifecycle.activeCount === 1 ? "Bean" : "Beans"} and ${insights.shelfCount} live Shelf ${insights.shelfCount === 1 ? "ref" : "refs"} are serving ${insights.activeGrantCount} connected AI ${insights.activeGrantCount === 1 ? "host" : "hosts"}.`,
    });
  }

  return (
    <Stack gap={24}>
      <PageHeader
        title="Tasting Notes"
        detail="How your Taste leans — deterministic notes distilled from your confirmed Beans"
        leading={leading}
      />

      {/* Primary hairline typographic summary (no cramped StatCard pill boxes) */}
      <Card variant="raised" density="regular">
        <Stack gap={16}>
          <div className="taste-strip">
            <div className="taste-metric">
              <Text variant="meta">Confirmed Beans</Text>
              <span className="taste-metric-value">{insights.totalCount}</span>
              <Text variant="meta">
                Confirmed takes · {insights.privateCount} private,{" "}
                {insights.publicCount} on the Table
              </Text>
            </div>

            <div className="taste-metric">
              <Text variant="meta">Reading vs Work Origins</Text>
              <span className="taste-metric-value">
                {insights.originMix.readingCount} : {insights.originMix.workCount}
              </span>
              <Text variant="meta">
                {insights.originMix.uniqueSourceUrlCount} unique{" "}
                {insights.originMix.uniqueSourceUrlCount === 1
                  ? "source"
                  : "sources"}{" "}
                read
              </Text>
            </div>

            <div className="taste-metric">
              <Text variant="meta">Roast Log Revisions</Text>
              <span className="taste-metric-value">
                {insights.revisionCount}
              </span>
              <Text variant="meta">
                {insights.shelfCount} on Shelf ·{" "}
                {insights.activeGrantCount > 0
                  ? `${insights.activeGrantCount} AI linked`
                  : "Brew Bar unlinked"}
              </Text>
            </div>
          </div>

          <Divider />

          <Inline gap={8} align="center" wrap>
            <Text variant="meta">Filter My Beans:</Text>
            <Button
              emphasis="soft"
              size="compact"
              onClick={() => onSelectLifecycle("active")}
            >
              Active ({insights.lifecycle.activeCount})
            </Button>
            <Button
              emphasis="soft"
              size="compact"
              onClick={() => onSelectLifecycle("in_tension")}
            >
              In Tension ({insights.lifecycle.inTensionCount})
            </Button>
            <Button
              emphasis="soft"
              size="compact"
              onClick={() => onSelectLifecycle("superseded")}
            >
              Updated Mind ({insights.lifecycle.supersededCount})
            </Button>
          </Inline>
        </Stack>
      </Card>

      {/* Deterministic Taste Reflections */}
      {reflections.length > 0 ? (
        <Card
          title="Palate Check"
          description="Honest deterministic observations from your current Beans — zero server AI"
          variant="raised"
          density="regular"
        >
          <Stack gap={12}>
            {reflections.map((item) => (
              <Inline
                key={item.id}
                justify="between"
                align="center"
                gap={12}
                wrap
              >
                <Text variant="body">{item.text}</Text>
                {item.actionLabel && item.onAction ? (
                  <Button
                    emphasis="soft"
                    size="compact"
                    onClick={item.onAction}
                  >
                    {item.actionLabel}
                  </Button>
                ) : null}
              </Inline>
            ))}
          </Stack>
        </Card>
      ) : null}

      <div className="split-grid">
        {/* Clean proportional domain bars (zero "coverage 50%" boilerplate) */}
        <Card
          title="Taste Profile by Domain"
          description="Topics you have sharpened most — click any domain to filter My Beans"
          variant="raised"
          density="regular"
        >
          {insights.topTags.length === 0 ? (
            <EmptyResult empty="Add Domains when Roasting Beans to see where your judgment concentrates." />
          ) : (
            <Stack gap={4}>
              {insights.topTags.map((item) => {
                const pct = Math.max(
                  8,
                  Math.round((item.count / maxTagCount) * 100),
                );
                return (
                  <button
                    key={item.tag}
                    type="button"
                    className="domain-bar-row"
                    onClick={() => onSelectDomain(item.tag)}
                  >
                    <Text variant="body">#{item.tag}</Text>
                    <div className="domain-bar-track" aria-hidden="true">
                      <div
                        className="domain-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <Text variant="meta">
                      {item.count} {item.count === 1 ? "Bean" : "Beans"}
                    </Text>
                  </button>
                );
              })}
            </Stack>
          )}
        </Card>

        <RecordFacts
          title="Roast Balance & Evolution"
          source="Your confirmed Beans & Roast Log"
          asOf={asOfLabel}
          facts={[
            {
              id: "ai-roasted",
              label: "AI-Roasted · Captured in AI",
              value: insights.captureMix.agentAttestedCount,
              unit: "Beans",
            },
            {
              id: "web-roasted",
              label: "Web-Roasted · Written on Web",
              value: insights.captureMix.uiAttestedCount,
              unit: "Beans",
            },
            {
              id: "supersedes",
              label: "Updated Mind (Replaces)",
              value: insights.relationCounts.supersedes,
            },
            {
              id: "refines",
              label: "Refined (Builds on)",
              value: insights.relationCounts.refines,
            },
            {
              id: "tensions",
              label: "In Tension Links",
              value: insights.relationCounts.tensionsWith,
            },
          ]}
        />
      </div>

      {insights.monthlyActivity.length >= 2 ? (
        <Chart
          title="Roast Cadence"
          series="Confirmed revisions per month"
          unit="revisions"
          source="Your Roast Log"
          asOf={asOfLabel}
          points={insights.monthlyActivity.map((m) => ({
            id: m.month,
            label: m.month,
            value: m.count,
          }))}
        />
      ) : insights.monthlyActivity.length === 1 ? (
        <Card
          title="Roast Cadence"
          description={`${insights.monthlyActivity[0]!.count} confirmed ${insights.monthlyActivity[0]!.count === 1 ? "revision" : "revisions"} in ${insights.monthlyActivity[0]!.month}`}
          variant="raised"
          density="compact"
        >
          <Text variant="help">
            Your month-over-month trend chart activates automatically once your
            Roast Log spans two months.
          </Text>
        </Card>
      ) : (
        <Card
          title="Roast Cadence"
          description="Monthly revision rhythm appears once you Roast your first Bean"
          variant="outlined"
          density="regular"
        >
          <Text variant="help">
            Every new Bean and revision recorded in My Roastery updates this
            deterministic timeline.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
