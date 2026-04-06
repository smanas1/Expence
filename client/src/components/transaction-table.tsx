import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { Download, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { formatCalendarDate, formatCurrency, formatRecentDate } from "../lib/format";
import type { Transaction } from "../types";

interface TransactionTableProps {
  rows: Transaction[];
  loading?: boolean;
  onDeleteSelected: (ids: string[]) => void;
  onRemoveDonation?: (id: string) => void;
}

export function TransactionTable({ rows, loading, onDeleteSelected, onRemoveDonation }: TransactionTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: "select",
        header: () => <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Pick</span>,
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4 rounded border-slate-300"
          />
        ),
      },
      { accessorKey: "title", header: "Title" },
      { accessorKey: "section", header: "Section" },
      { accessorKey: "category", header: "Category" },
      { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
      { accessorKey: "kind", header: "Type", cell: ({ row }) => row.original.kind },
      { accessorKey: "occurredAt", header: "When", cell: ({ row }) => <span title={formatRecentDate(row.original.occurredAt)}>{formatCalendarDate(row.original.occurredAt)}</span> },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) =>
          row.original.kind === "donation" ? (
            <button
              type="button"
              onClick={() => onRemoveDonation?.(row.original._id)}
              className="inline-flex items-center gap-2 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 dark:border-rose-800 dark:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          ),
      },
    ],
    [onRemoveDonation],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  const selectedIds = table.getSelectedRowModel().rows.map((row) => row.original._id);

  const exportCsv = () => {
    const lines = [
      ["Title", "Category", "Amount", "Type", "Occurred At"].join(","),
      ...rows.map((row) => [row.title, row.category, row.amount, row.kind, row.occurredAt].join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-[28px] border border-white/30 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Monthly Cashflow Ledger</p>
          <p className="text-sm text-slate-500">Track income and expenses by section, month, and category.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm dark:border-slate-700">
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button type="button" onClick={() => onDeleteSelected(selectedIds)} disabled={!selectedIds.length} className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                    <th key={header.id} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={8} className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="rounded-2xl bg-slate-50/90 dark:bg-slate-950/70">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-3 text-sm text-slate-700 first:rounded-l-2xl last:rounded-r-2xl dark:text-slate-200">
                        {cell.column.columnDef.cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : String(cell.getValue() ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
