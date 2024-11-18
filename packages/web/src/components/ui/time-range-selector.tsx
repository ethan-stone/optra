"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DateRangeSelector({ timePeriod }: { timePeriod: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const searchParams = new URLSearchParams(params);

  return (
    <Select
      defaultValue={timePeriod}
      onValueChange={(value) => {
        searchParams.set("timePeriod", value);
        router.push(`${pathname}?${searchParams.toString()}`, {
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
