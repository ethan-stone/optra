"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams, useRouter } from "next/navigation";

export function DateRangeSelector({ timePeriod }: { timePeriod: string }) {
  const router = useRouter();
  const params = useParams<{ apiId: string }>();

  return (
    <Select
      defaultValue={timePeriod}
      onValueChange={(value) => {
        console.log(value);
        router.push(`/dashboard/apis/${params.apiId}?timePeriod=${value}`, {
          scroll: false,
        });
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a time period" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1m">1 Month</SelectItem>
        <SelectItem value="3m">3 Months</SelectItem>
        <SelectItem value="6m">6 Months</SelectItem>
      </SelectContent>
    </Select>
  );
}
