'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileDown, Search, SlidersHorizontal } from 'lucide-react'

import { exportPdfReport } from '@/lib/export-pdf'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  filterComponent?: React.ReactNode
  toolbarRight?: React.ReactNode
  tableClassName?: string
  exportConfig?: {
    title: string
    subtitle?: string
    filename?: string
  }
}

type DataTableColumnMeta = {
  cellClassName?: string
  headerClassName?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  filterComponent,
  toolbarRight,
  tableClassName,
  exportConfig,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [isExportOpen, setIsExportOpen] = React.useState(false)
  const [exportScope, setExportScope] = React.useState<'current' | 'all' | 'specific'>('current')
  const [selectedExportPage, setSelectedExportPage] = React.useState('1')

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const currentPage = table.getState().pagination.pageIndex + 1
  const pageCount = table.getPageCount()
  const pageSize = table.getState().pagination.pageSize
  const allFilteredRows = table.getPrePaginationRowModel().rows
  const currentPageRows = table.getRowModel().rows

  React.useEffect(() => {
    setSelectedExportPage(String(currentPage))
  }, [currentPage])

  const getColumnLabel = (columnId: string) =>
    columnId
      .replaceAll('-', ' ')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())

  const exportableColumns = table
    .getVisibleLeafColumns()
    .filter((column) => !['actions', 'select'].includes(column.id))

  const buildExportColumns = () =>
    exportableColumns.map((column) => ({
      header:
        typeof column.columnDef.header === 'string'
          ? column.columnDef.header
          : getColumnLabel(column.id),
      value: (row: TData) => {
        const rawValue = (row as Record<string, unknown>)[column.id]
        if (rawValue == null) return ''
        return String(rawValue)
      },
    }))

  const getRowsForExport = (): Row<TData>[] => {
    if (exportScope === 'all') return allFilteredRows
    if (exportScope === 'specific') {
      const pageIndex = Math.max(0, Number(selectedExportPage || '1') - 1)
      const startIndex = pageIndex * pageSize
      return allFilteredRows.slice(startIndex, startIndex + pageSize)
    }
    return currentPageRows
  }

  const handleExport = () => {
    if (!exportConfig) return

    const rowsToExport = getRowsForExport().map((row) => row.original)

    exportPdfReport({
      title: exportConfig.title,
      subtitle:
        exportScope === 'all'
          ? `${exportConfig.subtitle ?? 'Filtered table export'} • All filtered rows`
          : exportScope === 'specific'
            ? `${exportConfig.subtitle ?? 'Filtered table export'} • Page ${selectedExportPage}`
            : `${exportConfig.subtitle ?? 'Filtered table export'} • Current page`,
      filename: exportConfig.filename,
      columns: buildExportColumns(),
      rows: rowsToExport,
    })

    setIsExportOpen(false)
  }

  return (
    <div className="min-w-0 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {searchKey && (
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="w-full pl-9"
              />
            </div>
          )}
          {filterComponent}
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 xl:w-auto xl:justify-end">
          {toolbarRight}
          {exportConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportOpen(true)}
              disabled={allFilteredRows.length === 0}
              className="w-full shrink-0 sm:w-auto"
            >
              <FileDown className="mr-2 size-4" />
              Export PDF
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
                <SlidersHorizontal className="mr-2 size-4" />
                Columns
                <ChevronDown className="ml-2 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <Table className={tableClassName}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined

                  return (
                    <TableHead
                      key={header.id}
                      className={cn('bg-muted/50 font-semibold', meta?.headerClassName)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined

                    return (
                    <TableCell key={cell.id} className={meta?.cellClassName}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )})}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <span>
              {table.getFilteredSelectedRowModel().rows.length} of{' '}
            </span>
          )}
          <span>
            {table.getFilteredRowModel().rows.length} row(s)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-4" />
              <span className="sr-only">Go to first page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Go to previous page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Go to next page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-4" />
              <span className="sr-only">Go to last page</span>
            </Button>
          </div>
        </div>
      </div>

      {exportConfig && (
        <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Export PDF</DialogTitle>
              <DialogDescription>
                Export only the columns currently shown and the rows from the selected table scope.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">What to print</div>
                <Select
                  value={exportScope}
                  onValueChange={(value: 'current' | 'all' | 'specific') => setExportScope(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current page</SelectItem>
                    <SelectItem value="all">All filtered rows</SelectItem>
                    <SelectItem value="specific">Specific page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {exportScope === 'specific' && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Page to print</div>
                  <Select value={selectedExportPage} onValueChange={setSelectedExportPage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: pageCount }, (_, index) => (
                        <SelectItem key={index + 1} value={String(index + 1)}>
                          Page {index + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                <p>{exportableColumns.length} visible column(s) will be exported.</p>
                <p className="mt-1">
                  {exportScope === 'all'
                    ? `${allFilteredRows.length} filtered row(s)`
                    : exportScope === 'specific'
                      ? `Rows from page ${selectedExportPage}`
                      : `${currentPageRows.length} row(s) from current page`}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExportOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport}>Print PDF</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
