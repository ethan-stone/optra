"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "./chart";

type Props =
  | {
      groupBy: "day";
      data: {
        yearMonthDay: string;
        total: number;
      }[];
    }
  | {
      groupBy: "month";
      data: {
        yearMonth: string;
        total: number;
      }[];
    };
export function TokenGenerationsChart({ groupBy, data }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-96 flex-col rounded border border-stone-300 py-4 shadow">
        <div className="flex flex-col px-8 pb-4">
          <h4 className="text-md font-semibold">
            Number of Generations Per Month
          </h4>
          <span className="text-xs text-stone-500">
            This is the number of token generations per month.
          </span>
        </div>
        <ChartContainer
          config={{
            total: {
              label: "Total",
              color: "#2563eb",
            },
          }}
          className="min-h-[200px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 0, right: 20, bottom: 0, left: -20 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={groupBy === "day" ? "yearMonthDay" : "yearMonth"}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval="equidistantPreserveStart"
              type="category"
              padding={{ left: 10, right: 10 }}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              radius={4}
              fill="var(--color-total)"
              name="Total"
              dataKey="total"
              stackId="yearMonth"
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
