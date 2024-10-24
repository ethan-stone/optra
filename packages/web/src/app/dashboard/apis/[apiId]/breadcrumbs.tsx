"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split("/").slice(2);

  console.log(segments);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, idx) => {
          return (
            <>
              <BreadcrumbItem key={segment}>
                <BreadcrumbLink
                  href={`/dashboard/${segments.slice(0, idx + 1).join("/")}`}
                >
                  {segment}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {idx !== segments.length - 1 && <BreadcrumbSeparator />}
            </>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
