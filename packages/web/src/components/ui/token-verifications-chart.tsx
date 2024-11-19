"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegendContent,
} from "./chart";

type Props =
  | {
      groupBy: "day";
      data: {
        yearMonthDay: string;
        successful: number;
        failed: number;
      }[];
    }
  | {
      groupBy: "month";
      data: {
        yearMonth: string;
        successful: number;
        failed: number;
      }[];
    };

export function TokenVerificationsChart({ data, groupBy }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row justify-between">
        <h4 className="text-md text-center font-semibold">
          Number of Verifications Per Month
        </h4>
      </div>
      <div className="flex h-96 justify-center rounded border border-stone-300 py-8 text-xs shadow">
        <ChartContainer
          config={{
            successful: {
              label: "Successful",
              color: "#1d4ed8",
            },
            failed: {
              label: "Failed",
              color: "#b91c1c",
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
              name="Successful Verifications"
              dataKey="successful"
              fill="var(--color-successful)"
            />
            <Bar
              radius={4}
              name="Failed Verifications"
              dataKey="failed"
              fill="var(--color-failed)"
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
