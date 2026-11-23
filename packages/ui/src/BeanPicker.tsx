"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Divider,
  EmptyResult,
  Heading,
  Inline,
  Notice,
  SearchField,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
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
    <Surface className="cc-card">
      <Stack gap={16}>
        <div className="cc-row-between">
          <Stack gap={4}>
            <Badge tone="brand">Brew Bean Picker</Badge>
            <Heading level={3}>Choose perspectives for this task</Heading>
          </Stack>
          <Text variant="meta">{selectedIds.length} selected</Text>
        </div>

        {reason || hasTensionInList ? (
          <Notice title="Perspective tension or choice needed" tone="warning">
            {reason ??
              "Some candidate Beans are marked tensions_with each other. Pick which criteria should guide this task."}
          </Notice>
        ) : null}

        <SearchField
          label="Filter candidate Beans"
          value={query}
          onValueChange={setQuery}
          placeholder="Search title, trade-off, tag, or @handle"
        />

        {filtered.length === 0 ? (
          <EmptyResult
            query={query}
            onClear={() => setQuery("")}
            empty="No accessible Beans matched."
          />
        ) : (
          <Stack gap={8}>
            {filtered.map((bean) => {
              const checked = selectedIds.includes(bean.id);
              return (
                <div key={bean.id} className="cc-muted-box">
                  <Stack gap={8}>
                    <div className="cc-row-between">
                      <Checkbox
                        label={bean.title}
                        checked={checked}
                        onCheckedChange={() => toggle(bean.id)}
                      />
                      <Inline gap={4}>
                        <Badge tone="neutral">@{bean.ownerHandle}</Badge>
                        <Badge tone={bean.visibility === "public" ? "brand" : "neutral"}>
                          {bean.visibility}
                        </Badge>
                        {bean.hasTension ? <Badge tone="warning">tension</Badge> : null}
                        {bean.supersededByBeanId ? (
                          <Badge tone="danger">superseded</Badge>
                        ) : null}
                      </Inline>
                    </div>
                    <Text variant="help">{bean.tradeoffPreview}</Text>
                    {bean.tags.length > 0 ? (
                      <Inline gap={4}>
                        {bean.tags.map((tag) => (
                          <Badge key={tag} tone="neutral">
                            #{tag}
                          </Badge>
                        ))}
                      </Inline>
                    ) : null}
                  </Stack>
                </div>
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
            pendingLabel="Applying…"
            onClick={() =>
              onApply(beans.filter((b) => selectedIds.includes(b.id)))
            }
          >
            Apply Selected Perspectives ({selectedIds.length})
          </Button>
        </Inline>
      </Stack>
    </Surface>
  );
}
