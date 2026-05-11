"use client";

/** File: Dashboard overview page that aggregates fiscalisation, failure, user, and health metrics. */

import React, { useEffect, useState, useCallback } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle, Users, Activity } from 'lucide-react';
import { parseMauritiusDate, getMauritiusNow, isToday, isThisWeek, isThisMonth } from '@/lib/utils';
import { AuditRecord, User } from '@/types';

/**
 * Base configuration for API communication.
 * All requests go through the secure Next.js proxy route at /api/admin
 * which adds authentication and forwards to the VPS API.
 */
const API_BASE = '/api/admin';
const ENDPOINTS = {
  success: `${API_BASE}/admin/audit?status=SUCCESS`,
  failed: `${API_BASE}/admin/audit?status=FAILED`,
  users: `${API_BASE}/admin/users`,
  health: `/`,
};

// ── Overview Dashboard

/**
 * DashboardPage: The main overview screen for the MRA Fiscalisation system.
 * It periodically fetches data across 4 endpoints to provide real-time monitoring.
 * @returns Dashboard overview UI with real-time KPI cards.
 */
export default function DashboardPage() {
  const [successRecords, setSuccessRecords] = useState<AuditRecord[]>([]);
  const [successTotal, setSuccessTotal] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [healthStatus, setHealthStatus] = useState<'Operational' | 'Unreachable'>('Operational');

  const [loading, setLoading] = useState({
    success: true,
    failed: true,
    users: true,
    health: true,
  });

  const [error, setError] = useState({
    success: false,
    failed: false,
    users: false,
    health: false,
  });

  const [fiscalisedTab, setFiscalisedTab] = useState<'all' | 'today' | 'week' | 'month'>('all');

  /**
   * Helper to construct authorized request headers.
   */
  const getHeaders = () => ({
    'Content-Type': 'application/json',
  });

  /**
   * Fetches successful audit logs and parses them for client-side date filtering.
   */
  const fetchSuccess = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.success, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const records = Array.isArray(data) ? data : data.logs || data.data || [];
      setSuccessRecords(records);
      setSuccessTotal(typeof data?.total === 'number' ? data.total : records.length);
      setError(p => ({ ...p, success: false }));
    } catch {
      setError(p => ({ ...p, success: true }));
    } finally {
      setLoading(p => ({ ...p, success: false }));
    }
  }, []);

  /**
   * Fetches failed audit logs to display the total failure count.
   */
  const fetchFailed = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.failed, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const records = Array.isArray(data) ? data : data.logs || data.data || [];
      setFailedCount(records.length);
      setError(p => ({ ...p, failed: false }));
    } catch {
      setError(p => ({ ...p, failed: true }));
    } finally {
      setLoading(p => ({ ...p, failed: false }));
    }
  }, []);

  /**
   * Fetches registered companies and counts those with at least one active API key.
   */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.users, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const users: User[] = Array.isArray(data) ? data : data.data || [];
      const count = users.filter(usr => usr.apiKeys?.some(key => key.isActive)).length;
      setActiveUsersCount(count);
      setError(p => ({ ...p, users: false }));
    } catch {
      setError(p => ({ ...p, users: true }));
    } finally {
      setLoading(p => ({ ...p, users: false }));
    }
  }, []);

  /**
   * Simple health check for the MRA Proxy server.
   */
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.health, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed');
      setHealthStatus('Operational');
      setError(p => ({ ...p, health: false }));
    } catch {
      setHealthStatus('Unreachable');
      setError(p => ({ ...p, health: true }));
    } finally {
      setLoading(p => ({ ...p, health: false }));
    }
  }, []);

  const fetchAllStats = useCallback(() => {
    fetchSuccess();
    fetchFailed();
    fetchUsers();
    fetchHealth();
  }, [fetchSuccess, fetchFailed, fetchUsers, fetchHealth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAllStats();

    // Stats auto-refresh (60s)
    const interval60 = setInterval(() => {
      fetchSuccess();
      fetchFailed();
      fetchUsers();
    }, 60000);

    // Health auto-refresh (30s)
    const interval30 = setInterval(() => {
      fetchHealth();
    }, 30000);

    return () => {
      clearInterval(interval60);
      clearInterval(interval30);
    };
  }, [fetchAllStats, fetchSuccess, fetchFailed, fetchUsers, fetchHealth]);

  /**
   * Computes the number of fiscalisations based on the currently selected time window.
   */
  const getFilteredSuccessCount = () => {
    if (fiscalisedTab === 'all') return successTotal;

    const now = getMauritiusNow();
    return successRecords.filter(record => {
      if (!record.fiscalisedAt) return false;
      const d = parseMauritiusDate(record.fiscalisedAt);
      if (!d) return false;

      switch (fiscalisedTab) {
        case 'today': return isToday(d, now);
        case 'week': return isThisWeek(d, now);
        case 'month': return isThisMonth(d, now);
        default: return false;
      }
    }).length;
  };

  const fiscalisedDescription = (() => {
    switch (fiscalisedTab) {
      case 'all':
        return 'Total successful records';
      case 'today':
        return 'Successful records for today';
      case 'week':
        return 'Successful records this week';
      case 'month':
        return 'Successful records this month';
      default:
        return 'Total successful records';
    }
  })();

  return (
    <div className="flex-1 space-y-8 p-8 md:p-10 lg:p-12 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col space-y-2 pb-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Fiscalisation Overview
        </h2>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Monitor your MRA electronic invoice synchronization metrics, active users, and the live operational status of the Mauritius Revenue Authority API.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric: Successful Fiscalisations */}
        <StatCard
          title="Total Fiscalised"
          value={getFilteredSuccessCount().toLocaleString()}
          loading={loading.success}
          error={error.success}
          icon={<FileText className="h-5 w-5" />}
          description={fiscalisedDescription}
          extraContent={
            <Tabs
              value={fiscalisedTab}
              onValueChange={(v: string) => setFiscalisedTab(v as 'all' | 'today' | 'week' | 'month')}
              className="mt-3 w-full"
            >
              <TabsList className="grid w-full grid-cols-4 gap-1 h-9 bg-muted/50">
                <TabsTrigger value="all" className="text-xs px-2">All Time</TabsTrigger>
                <TabsTrigger value="today" className="text-xs px-2">Today</TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-2">Week</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-2">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />

        {/* Metric: Failures */}
        <StatCard
          title="Failed Fiscalisations"
          value={failedCount.toLocaleString()}
          loading={loading.failed}
          error={error.failed}
          icon={<AlertCircle className="h-5 w-5" />}
          description="Lifetime failed synchronization attempts"
          valueClassName="text-destructive font-black"
          badge={failedCount > 0 ? <Badge variant="destructive" className="ml-2">Attention</Badge> : undefined}
        />

        {/* Metric: User Engagement */}
        <StatCard
          title="Active Users"
          value={activeUsersCount.toLocaleString()}
          loading={loading.users}
          error={error.users}
          icon={<Users className="h-5 w-5" />}
          description="Users currently with active API Keys"
        />

        {/* Metric: System Health */}
        <StatCard
          title="Live MRA Status"
          value={healthStatus}
          loading={loading.health}
          error={error.health && healthStatus === 'Unreachable' ? false : error.health}
          description={loading.health ? '' : 'Refreshes every 30 seconds'}
          icon={<Activity className="h-5 w-5" />}
          valueClassName={healthStatus === 'Operational' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-destructive font-bold'}
          badge={
            healthStatus === 'Operational' 
              ? <Badge variant="success" className="ml-2 px-1.5 min-w-0"><div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /></Badge>
              : <Badge variant="destructive" className="ml-2">Offline</Badge>
          }
        />
      </div>
    </div>
  );
}
