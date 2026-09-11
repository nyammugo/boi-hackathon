import { z } from "zod";

// Matches BuildPrompt's single-series chart contract and supported chart types.
const primitive = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
const label = z.string().trim().min(1).max(160);
const key = z.string().trim().min(1).max(80);
const inputSchema = z.object({
  type: z.enum(["area", "bar", "donut", "line", "pie", "scatter"]),
  title: label.optional(),
  xKey: key.optional(),
  yKey: key.optional(),
  xLabel: label.optional(),
  yLabel: label.optional(),
  description: z.string().max(1000).optional(),
  data: z
    .array(
      z.record(key, primitive).refine((row) => Object.keys(row).length <= 24),
    )
    .min(2)
    .max(80),
});

export type ChartSpec = {
  type: z.infer<typeof inputSchema>["type"];
  title: string;
  xLabel: string;
  yLabel: string;
  description?: string;
  data: { key: string; label: string; x: string | number; value: number }[];
};

function numeric(value: unknown) {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const text = value.trim().replace(/,/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

export function parseChartSpec(json: string): ChartSpec | undefined {
  try {
    const raw = z.record(z.string(), z.unknown()).parse(JSON.parse(json));
    const input = inputSchema.parse({
      ...raw,
      type: raw.type ?? raw.chartType,
      xKey: raw.xKey ?? raw.x,
      yKey: raw.yKey ?? raw.y,
      description: raw.description ?? raw.ariaDescription,
    });
    const yKey =
      input.yKey ??
      "value count total amount number percent percentage y"
        .split(" ")
        .find(
          (candidate) =>
            candidate !== input.xKey &&
            input.data.every((row) => numeric(row[candidate]) !== undefined),
        );
    const xKey =
      input.xKey ??
      "name label category type status date month week period x"
        .split(" ")
        .find(
          (candidate) =>
            candidate !== yKey &&
            input.data.every((row) => row[candidate] != null),
        );
    if (!xKey || !yKey || xKey === yKey) return undefined;
    const data: ChartSpec["data"] = [];
    const occurrences = new Map<string, number>();
    for (const row of input.data) {
      const value = numeric(row[yKey]);
      const x = row[xKey];
      if (
        value === undefined ||
        x == null ||
        typeof x === "boolean" ||
        String(x).trim() === ""
      )
        return undefined;
      const numericX = numeric(x);
      if (input.type === "scatter" && numericX === undefined) return undefined;
      if (["bar", "pie", "donut"].includes(input.type) && value < 0)
        return undefined;
      const signature = JSON.stringify([x, value]);
      const occurrence = occurrences.get(signature) ?? 0;
      occurrences.set(signature, occurrence + 1);
      data.push({
        key: `${signature}:${occurrence}`,
        label: String(x),
        x:
          input.type === "scatter" && numericX !== undefined
            ? numericX
            : String(x),
        value,
      });
    }
    if (
      ["pie", "donut"].includes(input.type) &&
      !data.some((row) => row.value > 0)
    )
      return undefined;
    return {
      type: input.type,
      title: input.title ?? `${yKey} by ${xKey}`,
      xLabel: input.xLabel ?? xKey,
      yLabel: input.yLabel ?? yKey,
      description: input.description,
      data,
    };
  } catch {
    return undefined;
  }
}

export function formatChartValue(
  value: number,
  label: string,
  compact = false,
) {
  const number = new Intl.NumberFormat("en-IE", {
    maximumFractionDigits: 2,
    notation: compact ? "compact" : "standard",
  }).format(value);
  const currency = /€|\bEUR\b/i.test(label)
    ? "€"
    : /£|\bGBP\b/i.test(label)
      ? "£"
      : /\$|\bUSD\b/i.test(label)
        ? "$"
        : "";
  // Values stay in the units supplied by the chart; never guess a percent scale.
  return currency
    ? `${currency}${number}`
    : /%|\bpercent(?:age)?\b/i.test(label)
      ? `${number}%`
      : number;
}
