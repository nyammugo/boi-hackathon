import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type ChartSpec, formatChartValue } from "./chart-spec";

const colours = [
  "#0000ff",
  "#00a888",
  "#000066",
  "#5999e8",
  "#e9a344",
  "#ae6395",
];

export function ChartOutput({ spec }: { spec: ChartSpec }) {
  const id = useId();
  const circular = spec.type === "pie" || spec.type === "donut";
  const formatValue = (value: number, compact = false) =>
    formatChartValue(value, spec.yLabel, compact);
  const tooltip = (
    <Tooltip
      formatter={(value) => [
        typeof value === "number" ? formatValue(value) : String(value),
        spec.yLabel,
      ]}
      contentStyle={{
        border: "1px solid #dce6f5",
        borderRadius: 8,
        fontSize: 12,
        color: "#000066",
      }}
    />
  );
  const axes = (
    <>
      <CartesianGrid stroke="#e5ebf4" strokeDasharray="3 5" vertical={false} />
      <XAxis
        dataKey="x"
        type={spec.type === "scatter" ? "number" : "category"}
        tick={{ fontSize: 11, fill: "#626779" }}
        tickLine={false}
        axisLine={{ stroke: "#dce6f5" }}
        tickFormatter={(value) =>
          String(value).length > 14
            ? `${String(value).slice(0, 13)}…`
            : String(value)
        }
        interval="preserveStartEnd"
      />
      <YAxis
        dataKey="value"
        type="number"
        width={64}
        tick={{ fontSize: 11, fill: "#626779" }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(value: number) => formatValue(value, true)}
      />
      {tooltip}
    </>
  );
  const props = {
    data: spec.data,
    margin: { top: 16, right: 16, bottom: 12, left: 0 },
    accessibilityLayer: true,
  };
  const chart = (() => {
    switch (spec.type) {
      case "line":
        return (
          <LineChart {...props}>
            {axes}
            <Line
              type="linear"
              dataKey="value"
              name={spec.yLabel}
              stroke={colours[0]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: colours[0], stroke: "white", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart {...props}>
            {axes}
            <Area
              type="linear"
              dataKey="value"
              name={spec.yLabel}
              stroke={colours[0]}
              fill={colours[0]}
              fillOpacity={0.12}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
          </AreaChart>
        );
      case "bar":
        return (
          <BarChart {...props}>
            {axes}
            <Bar
              dataKey="value"
              name={spec.yLabel}
              fill={colours[0]}
              radius={[5, 5, 0, 0]}
              maxBarSize={64}
              isAnimationActive={false}
            />
          </BarChart>
        );
      case "scatter":
        return (
          <ScatterChart {...props}>
            {axes}
            <Scatter
              data={spec.data}
              name={spec.yLabel}
              fill={colours[0]}
              isAnimationActive={false}
            />
          </ScatterChart>
        );
      default:
        return (
          <PieChart accessibilityLayer>
            {tooltip}
            <Pie
              data={spec.data}
              dataKey="value"
              nameKey="label"
              innerRadius={spec.type === "donut" ? "50%" : 0}
              outerRadius="80%"
              stroke="white"
              strokeWidth={3}
              isAnimationActive={false}
            >
              {spec.data.map((row, index) => (
                <Cell key={row.key} fill={colours[index % colours.length]} />
              ))}
            </Pie>
          </PieChart>
        );
    }
  })();

  return (
    <figure
      className="chat-chart"
      aria-labelledby={`${id}-title`}
      data-chart-type={spec.type}
    >
      <figcaption id={`${id}-title`}>{spec.title}</figcaption>
      {spec.description && (
        <p className="chart-description">{spec.description}</p>
      )}
      {!circular && <div className="chart-axis-label">{spec.yLabel}</div>}
      <div className="chart-canvas">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {chart}
        </ResponsiveContainer>
      </div>
      {!circular && <div className="chart-x-label">{spec.xLabel}</div>}
      {circular && (
        <ul className="chart-legend" aria-label="Chart legend">
          {spec.data.map((row, index) => (
            <li key={row.key}>
              <i
                aria-hidden="true"
                style={{ background: colours[index % colours.length] }}
              />
              <span>{row.label}</span>
              <strong>{formatValue(row.value)}</strong>
            </li>
          ))}
        </ul>
      )}
      <details className="chart-data">
        <summary>View chart data</summary>
        <table>
          <caption className="sr-only">{spec.title}</caption>
          <thead>
            <tr>
              <th scope="col">{spec.xLabel}</th>
              <th scope="col">{spec.yLabel}</th>
            </tr>
          </thead>
          <tbody>
            {spec.data.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{formatValue(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
