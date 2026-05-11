"use client";

/** File: Dashboard audit logs page with filtering, pagination, and CSV export tools. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Copy, Download, RefreshCw, Search } from "lucide-react";
import { AuditRecord } from "@/types";
import type { DateRange } from "react-day-picker";
import * as Portal from "@radix-ui/react-portal";

const API_BASE = '/api/admin';
const AUDIT_ENDPOINT = `${API_BASE}/admin/audit`;
const FETCH_LIMIT = 200;

type AuditStatusFilter = "ALL" | "SUCCESS" | "FAILED";

type AuditApiResponse = {
  logs?: AuditRecord[];
  data?: AuditRecord[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function truncate(value: string | null | undefined, max = 18): string {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function parseApiRecords(data: AuditApiResponse | AuditRecord[]): AuditRecord[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.logs)) return data.logs;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function csvEscape(value: unknown): string {
  const str = value == null ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function parseMauritiusStringDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  const [datePart] = dateStr.split(", ");
  if (!datePart) return null;

  const [dayStr, monthStr, yearStr] = datePart.split("/");
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);

  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function formatDateForRange(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// ── Fiscalisation Logs

/**
 * Renders the dashboard logs view and orchestrates audit log retrieval/filtering/export.
 * @returns Logs page UI for fiscalisation audit records.
 */
export default function LogsPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [status, setStatus] = useState<AuditStatusFilter>("ALL");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);

  const getHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
    }),
    []
  );

  const fetchAllLogs = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      try {
        const firstRes = await fetch(`${AUDIT_ENDPOINT}?page=1&limit=${FETCH_LIMIT}`, {
          headers: getHeaders(),
        });

        if (!firstRes.ok) throw new Error(`Failed to fetch audit logs (${firstRes.status})`);

        const firstData: AuditApiResponse | AuditRecord[] = await firstRes.json();
        const firstLogs = parseApiRecords(firstData);

        const pages = Array.isArray(firstData)
          ? 1
          : firstData.totalPages ?? Math.max(1, Math.ceil((firstData.total ?? firstLogs.length) / FETCH_LIMIT));

        const allLogs = [...firstLogs];

        for (let p = 2; p <= pages; p += 1) {
          const res = await fetch(`${AUDIT_ENDPOINT}?page=${p}&limit=${FETCH_LIMIT}`, {
            headers: getHeaders(),
          });
          if (!res.ok) throw new Error(`Failed to fetch audit logs (${res.status})`);
          const data: AuditApiResponse | AuditRecord[] = await res.json();
          allLogs.push(...parseApiRecords(data));
        }

        setLogs(allLogs);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch audit logs");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [getHeaders]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAllLogs();
  }, [fetchAllLogs]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllLogs(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchAllLogs]);

  const updateCalendarPosition = useCallback(() => {
    if (!triggerButtonRef.current) return;
    const rect = triggerButtonRef.current.getBoundingClientRect();
    setCalendarPosition({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    if (!isCalendarOpen) return;

    updateCalendarPosition();

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (calendarRef.current?.contains(target) || triggerButtonRef.current?.contains(target)) {
        return;
      }
      setIsCalendarOpen(false);
    };

    window.addEventListener("resize", updateCalendarPosition);
    window.addEventListener("scroll", updateCalendarPosition, true);
    document.addEventListener("mousedown", handleOutside);

    return () => {
      window.removeEventListener("resize", updateCalendarPosition);
      window.removeEventListener("scroll", updateCalendarPosition, true);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [isCalendarOpen, updateCalendarPosition]);

  const copyToClipboard = async (text: string | null | undefined) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op fallback
    }
  };

  const filteredLogs = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    return logs.filter((log) => {
      const statusMatch = status === "ALL" || log.status === status;
      if (!statusMatch) return false;

      const searchMatch =
        !trimmed ||
        (log.user?.ebsId ?? "").toLowerCase().includes(trimmed) ||
        (log.user?.name ?? "").toLowerCase().includes(trimmed);

      if (!searchMatch) return false;

      if (!dateRange?.from && !dateRange?.to) return true;

      const createdDate = parseMauritiusStringDate(log.createdAt);
      if (!createdDate) return false;

      if (dateRange.from) {
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        if (createdDate < from) return false;
      }

      if (dateRange.to) {
        const to = new Date(dateRange.to);
        to.setHours(23, 59, 59, 999);
        if (createdDate > to) return false;
      }

      return true;
    });
  }, [logs, query, status, dateRange]);

  const totalCount = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const currentPage = Math.min(page, totalPages);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const exportCsv = () => {
    setExporting(true);
    try {
      const headers = [
        "Invoice Number",
        "Company Name",
        "EBS ID",
        "Status",
        "IRN",
        "Error Message",
        "Fiscalised At",
        "Created At",
      ];

      const rows = filteredLogs.map((log) => [
        log.invoiceNumber ?? "",
        log.user?.name ?? "",
        log.user?.ebsId ?? "",
        log.status ?? "",
        log.irn ?? "",
        log.errorMessage ?? "",
        log.fiscalisedAt ?? "",
        log.createdAt ?? "",
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => csvEscape(cell)).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fiscalisation-logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError("CSV export failed. Please retry.");
    } finally {
      setExporting(false);
    }
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, -1, totalPages];
    if (page >= totalPages - 2) return [1, -1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, -1, page - 1, page, page + 1, -2, totalPages];
  }, [page, totalPages]);

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    // Only close if BOTH from and to are defined
    if (range?.from && range?.to) {
      setIsCalendarOpen(false)
    }
    // If only from is selected or range is undefined, do NOT close
  }

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-8 p-8 md:p-10 lg:p-12 max-w-screen-2xl mx-auto font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Fiscalisation Audit Logs
              {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h2>
            <p className="text-sm text-muted-foreground">Full audit trail of invoice fiscalisation attempts.</p>
          </div>

          <Button variant="outline" onClick={exportCsv} disabled={exporting || loading}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>

        <Card className="border-muted/60 shadow-sm bg-card">
          <CardContent className="p-6 space-y-4">
            <Tabs
              value={status}
              onValueChange={(value) => {
                setStatus(value as AuditStatusFilter);
                setPage(1);
              }}
            >
              <TabsList className="grid w-full grid-cols-3 md:w-[340px] h-9 bg-muted/50">
                <TabsTrigger value="ALL" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="SUCCESS" className="text-xs">SUCCESS</TabsTrigger>
                <TabsTrigger value="FAILED" className="text-xs">FAILED</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid gap-3 md:grid-cols-[1fr_minmax(280px,360px)]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by company name or EBS ID"
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  ref={triggerButtonRef}
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => {
                    if (!isCalendarOpen) updateCalendarPosition();
                    setIsCalendarOpen((prev) => !prev);
                  }}
                >
                  {dateRange?.from && dateRange?.to
                    ? `${formatDateForRange(dateRange.from)} → ${formatDateForRange(dateRange.to)}`
                    : dateRange?.from
                      ? `${formatDateForRange(dateRange.from)} → ...`
                      : "Pick a date range"}
                </Button>
                {isCalendarOpen && (
                  <Portal.Root>
                    <div
                      ref={calendarRef}
                      style={{
                        top: calendarPosition.top,
                        left: calendarPosition.left,
                        position: 'fixed',
                        zIndex: 9999,
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
                        maxWidth: 'calc(100vw - 24px)',
                        overflowX: 'auto'
                      }}
                    >
                      <Calendar
                        mode="range"
                        min={1}
                        selected={dateRange}
                        onSelect={handleDateSelect}
                        numberOfMonths={2}
                        classNames={{
                          months: "flex flex-row gap-4",
                          month: "space-y-3",
                          caption: "relative flex h-8 items-center justify-center",
                          caption_label: "text-sm font-semibold",
                          nav: "absolute inset-x-0 top-0 flex h-8 items-center justify-between px-1",
                          head_row: "grid grid-cols-7 gap-1",
                          head_cell: "h-8 w-8 text-center text-xs font-medium text-muted-foreground",
                          row: "grid grid-cols-7 gap-1",
                          cell: "h-8 w-8 p-0 text-center",
                          day: "h-8 w-8 rounded-md p-0 text-sm",
                          day_selected: "bg-primary text-primary-foreground",
                          day_range_start: "bg-primary text-primary-foreground",
                          day_range_end: "bg-primary text-primary-foreground",
                          day_range_middle: "bg-accent text-accent-foreground",
                        }}
                      />
                      {dateRange?.from && !dateRange?.to && (
                        <p style={{ marginTop: '8px', fontSize: '12px', color: '#b3b3b3' }}>
                          Now select an end date
                        </p>
                      )}
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setDateRange(undefined);
                            setPage(1);
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </Portal.Root>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/60 shadow-sm overflow-hidden bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold py-4 px-4">Invoice Number</TableHead>
                  <TableHead className="font-bold py-4 px-4">Company</TableHead>
                  <TableHead className="font-bold py-4 px-4">Status</TableHead>
                  <TableHead className="font-bold py-4 px-4">IRN</TableHead>
                  <TableHead className="font-bold py-4 px-4">Error Message</TableHead>
                  <TableHead className="font-bold py-4 px-4">Fiscalised At</TableHead>
                  <TableHead className="font-bold py-4 px-4">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j} className="py-4 px-4">
                          <Skeleton className="h-5 w-full max-w-[150px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-destructive">
                      <div className="space-y-2">
                        <p className="font-semibold">Failed to load audit logs</p>
                        <p className="text-xs text-muted-foreground">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => fetchAllLogs()}>
                          Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                      No logs match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="py-4 px-4 font-medium">{log.invoiceNumber || "-"}</TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-medium">{log.user?.name || "-"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{log.user?.ebsId || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <Badge variant={log.status === "SUCCESS" ? "success" : "destructive"}>{log.status}</Badge>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">{truncate(log.irn)}</span>
                          {log.irn && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => copyToClipboard(log.irn)}
                              aria-label="Copy IRN"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4 max-w-[260px]">
                        {log.status === "FAILED" && log.errorMessage ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help text-destructive text-sm">
                                {truncate(log.errorMessage, 48)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm break-words">{log.errorMessage}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-4 whitespace-nowrap text-sm text-muted-foreground">
                        {log.fiscalisedAt || "-"}
                      </TableCell>
                      <TableCell className="py-4 px-4 whitespace-nowrap text-sm text-muted-foreground">
                        {log.createdAt || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{totalCount}</span> | Page{" "}
            <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </p>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Page size</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
            </PaginationItem>

            {pageNumbers.map((p, idx) =>
              p < 0 ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink isActive={p === currentPage} onClick={() => setPage(p)}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </TooltipProvider>
  );
}
