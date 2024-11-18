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
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: -10, right: 20, bottom: 0, left: -20 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={groupBy === "day" ? "yearMonthDay" : "yearMonth"}
              tickLine={false}
              axisLine={{ stroke: "#94a3b8" }}
              interval="equidistantPreserveStart"
              type="category"
              padding={{ left: 10, right: 10 }}
            />
            <YAxis />
            <Tooltip cursor={false} />
            <Legend verticalAlign="top" height={36} />
            <Bar
              name="Successful Verifications"
              dataKey="successful"
              fill="#1d4ed8"
              stackId={groupBy === "day" ? "yearMonthDay" : "yearMonth"}
            />
            <Bar
              name="Failed Verifications"
              dataKey="failed"
              fill="#b91c1c"
              stackId={groupBy === "day" ? "yearMonthDay" : "yearMonth"}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
