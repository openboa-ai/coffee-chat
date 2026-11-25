"use client";

import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Chart } from "@openboa/yogurt/chart";
import { EmptyResult } from "@openboa/yogurt/empty-result";
import { Inline } from "@openboa/yogurt/inline";
import { List } from "@openboa/yogurt/list";
import { ListRow } from "@openboa/yogurt/list-row";
import { StatCard } from "@openboa/yogurt/motion-stat-card";
import { Progress } from "@openboa/yogurt/progress";
import { RecordFacts } from "@openboa/yogurt/record-facts";
import { Stack } from "@openboa/yogurt/stack";
import { Text } from "@openboa/yogurt/text";
import { PageHeader } from "@openboa/yogurt/top";
import type { PersonalInsightsView } from "@coffee-chat/core";

export interface InsightsPanelProps {
  insights: PersonalInsightsView;
  onSelectDomain: (tag: string) => void;
  onSelectLifecycle: (state: "active" | "in_tension" | "superseded") => void;
  onOpenConnect: () => void;
}

export function InsightsPanel({
  insights,
  onSelectDomain,
  onSelectLifecycle,
  onOpenConnect,
}: InsightsPanelProps) {
  const maxTagCount = insights.topTags[0]?.count ?? 1;
  const asOfLabel = new Date(insights.asOf).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const monthlySeries = insights.monthlyActivity.map((m) => m.count);

  return (
    <Stack gap={24}>
      <PageHeader
        title="Tasting Notes"
        detail="Personal stats & insights — deterministic aggregates from your confirmed Beans"
      />

      <div className="kpi-grid">
        <StatCard
          label="Beans"
          value={insights.totalCount}
          detail={`Confirmed takes · ${insights.privateCount} private, ${insights.publicCount} on the Table`}
          series={monthlySeries.length >= 2 ? monthlySeries : undefined}
        />
        <StatCard
          label="Active Criteria"
          value={insights.lifecycle.activeCount}
          detail={`${insights.lifecycle.inTensionCount} in tension · ${insights.lifecycle.supersededCount} updated mind`}
        />
        <StatCard
          label="Connected AI Apps"
          value={insights.activeGrantCount}
          detail={
            insights.activeGrantCount > 0
              ? "Brew ready in your connected AI"
              : "None connected yet"
          }
        />
        <StatCard
          label="Shelf"
          value={insights.shelfCount}
          detail="Live saved voices & takes"
        />
      </div>

      <Card
        title="Judgment Health"
        description="Mutually exclusive lifecycle across all confirmed Beans — click any bucket to filter My Beans"
        variant="raised"
        density="regular"
      >
        <Inline gap={12} align="center">
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
          {insights.activeGrantCount === 0 ? (
            <Button emphasis="quiet" size="compact" onClick={onOpenConnect}>
              Open Brew Setup →
            </Button>
          ) : null}
        </Inline>
      </Card>

      <div className="split-grid">
        <Card
          title="Domains"
          description="Decision topics across your confirmed Beans — click a topic to filter"
          variant="raised"
          density="regular"
        >
          {insights.topTags.length === 0 ? (
            <EmptyResult empty="Add Domains (topics) when Roasting Beans to see your coverage here." />
          ) : (
            <List label="Top decision domains" divided>
              {insights.topTags.map((item) => (
                <ListRow
                  key={item.tag}
                  title={`#${item.tag}`}
                  description={`${item.count} ${item.count === 1 ? "Bean" : "Beans"}`}
                  trailing={
                    <Badge tone="neutral" dot={false}>
                      {item.count}
                    </Badge>
                  }
                  value={
                    <Progress
                      label={`${item.tag} coverage`}
                      value={item.count}
                      max={maxTagCount}
                    />
                  }
                  onActivate={() => onSelectDomain(item.tag)}
                />
              ))}
            </List>
          )}
        </Card>

        <Stack gap={16}>
          <RecordFacts
            title="Origin & Roast Balance"
            source="Your confirmed Beans"
            asOf={asOfLabel}
            facts={[
              {
                id: "reading",
                label: "Reading Origins · From reading",
                value: insights.originMix.readingCount,
                unit: "Beans",
              },
              {
                id: "work",
                label: "Work Origins · From work",
                value: insights.originMix.workCount,
                unit: "Beans",
              },
              {
                id: "urls",
                label: "Unique Sources Read",
                value: insights.originMix.uniqueSourceUrlCount,
                unit: "URLs",
              },
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
            ]}
          />

          <RecordFacts
            title="Roast Log & Evolution"
            source="Your Roast Log & relations"
            asOf={asOfLabel}
            facts={[
              {
                id: "revisions",
                label: "Total Roast Log Revisions",
                value: insights.revisionCount,
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
        </Stack>
      </div>

      {insights.monthlyActivity.length > 0 ? (
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
      ) : (
        <Card
          title="Roast Cadence"
          description="Monthly revision rhythm appears once you Roast your first Bean"
          variant="outlined"
          density="regular"
        >
          <Text variant="help">
            Every new Bean and revision recorded in My Roastery updates this deterministic timeline.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
