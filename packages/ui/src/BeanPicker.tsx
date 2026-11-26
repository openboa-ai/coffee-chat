"use client";

import { useMemo, useState } from "react";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Checkbox } from "@openboa/yogurt/checkbox";
import { Divider } from "@openboa/yogurt/divider";
import { EmptyResult } from "@openboa/yogurt/empty-result";
import { Inline } from "@openboa/yogurt/inline";
import { Notice } from "@openboa/yogurt/notice";
import { SearchField } from "@openboa/yogurt/search-field";
import { Stack } from "@openboa/yogurt/stack";
import { Surface } from "@openboa/yogurt/surface";
import { Text } from "@openboa/yogurt/text";
import type { UiBeanSummary } from "./types.js";

export interface BeanPickerProps {
  beans: UiBeanSummary[];
  initialSelectedIds?: string[];
  reason?: string;
  applying?: boolean;
  onApply: (selectedBeans: UiBeanSummary[]) => void;
}

export function BeanPicker({
  beans,
  initialSelectedIds,
  reason,
  applying = false,
  onApply,
}: BeanPickerProps) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () =>
      initialSelectedIds ??
      beans.filter((b) => !b.supersededByBeanId).slice(0, 3).map((b) => b.id),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return beans;
    return beans.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.tradeoffPreview.toLowerCase().includes(q) ||
        b.ownerHandle.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [beans, query]);

  const hasTensionInList = beans.some((b) => b.hasTension);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <Card
      title="Brew · Choose Beans for this task"
      description="Apply confirmed takes to guide trade-offs without overstepping boundaries"
      headerAction={
        <Badge tone="neutral" dot={false}>
          {selectedIds.length} selected
        </Badge>
      }
      variant="raised"
      density="regular"
    >
      <Stack gap={16}>
        {reason || hasTensionInList ? (
          <Notice title="In Tension · Two Beans pull in different directions" tone="warning">
            {reason ??
              "Some matching Beans are in tension with each other. Pick which ones should lead here."}
          </Notice>
        ) : null}

        <SearchField
          label="Filter Beans"
          help="Search headline, trade-off, domain, or @handle"
          value={query}
          onValueChange={setQuery}
          placeholder="Search headline, trade-off, domain, or @handle"
        />

        {filtered.length === 0 ? (
          <EmptyResult
            query={query}
            onClear={() => setQuery("")}
            empty="No matching Beans found."
          />
        ) : (
          <Stack gap={8}>
            {filtered.map((bean) => {
              const checked = selectedIds.includes(bean.id);
              return (
                <Surface key={bean.id} variant="surface" density="compact">
                  <Stack gap={8}>
                    <Inline justify="between" align="center" gap={8}>
                      <Checkbox
                        label={bean.title}
                        checked={checked}
                        onCheckedChange={() => toggle(bean.id)}
                      />
                      <Inline gap={4}>
                        <Badge tone="neutral" dot={false}>
                          @{bean.ownerHandle}
                        </Badge>
                        {bean.hasTension ? (
                          <Badge tone="warning">In Tension</Badge>
                        ) : null}
                        {bean.supersededByBeanId ? (
                          <Badge tone="danger">Updated Mind</Badge>
                        ) : null}
                      </Inline>
                    </Inline>
                    <Text variant="help">{bean.tradeoffPreview}</Text>
                    {bean.tags.length > 0 ? (
                      <Inline gap={8}>
                        {bean.tags.map((tag) => (
                          <Badge key={tag} tone="neutral" dot={false}>
                            #{tag}
                          </Badge>
                        ))}
                      </Inline>
                    ) : null}
                  </Stack>
                </Surface>
              );
            })}
          </Stack>
        )}

        <Divider />

        <Inline gap={12}>
          <Button
            emphasis="filled"
            tone="brand"
            disabled={selectedIds.length === 0 || applying}
            pending={applying}
            pendingLabel="Brewing…"
            onClick={() =>
              onApply(beans.filter((b) => selectedIds.includes(b.id)))
            }
          >
            Brew Selected Beans ({selectedIds.length})
          </Button>
        </Inline>
      </Stack>
    </Card>
  );
}
