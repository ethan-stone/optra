"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split("/").slice(2);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, idx) => {
          return (
            <Fragment key={segment}>
              <BreadcrumbItem key={segment}>
                <BreadcrumbLink
                  href={`/dashboard/${segments.slice(0, idx + 1).join("/")}`}
                >
                  {segment}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {idx !== segments.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
