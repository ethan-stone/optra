"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TokenGenerationsChart({
  data,
}: {
  data: { yearMonth: string; total: number }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row justify-start">
        <h4 className="text-md text-center font-semibold">
          Number of Generations Per Month
        </h4>
      </div>
      <div className="flex h-96 justify-center rounded border border-stone-300 py-8 text-xs shadow">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: -10, right: 20, bottom: 0, left: -20 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="yearMonth"
              tickLine={false}
              axisLine={{ stroke: "#94a3b8" }}
              interval="preserveStartEnd"
              padding={{ left: 10, right: 10 }}
            />
            <YAxis />
            <Tooltip cursor={false} />
            <Legend verticalAlign="top" height={36} />
            <Bar
              name="Total"
              dataKey="total"
              fill="#1d4ed8"
              stackId="yearMonth"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
