"use client";

import { type OnChangeFn, type RowSelectionState } from "@tanstack/react-table";
import { useDataTable } from "@/components/ui/data-table";
import { columns } from "@/components/ui/scopes-columns";

type Props = {
  scopes: {
    id: string;
    name: string;
    description: string;
  }[];
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  rowSelection: RowSelectionState;
};

export function ScopesTable(props: Props) {
  const { DataTable } = useDataTable({
    columns,
    data: props.scopes,
    getRowId: (row) => row.id,
    onRowSelectionChange: props.onRowSelectionChange,
    state: {
      rowSelection: props.rowSelection,
    },
  });

  return <DataTable />;
}
