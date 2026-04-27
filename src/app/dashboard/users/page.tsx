"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Key } from 'lucide-react';
import { formatMauritiusDateTime } from '@/lib/utils';
import { User } from '@/types';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';

const API_BASE = '/api-proxy';
const ENDPOINT = `${API_BASE}/admin/users`;

/**
 * UsersPage: Manages the display and filtering of registered companies.
 * Features:
 * - Real-time client-side search.
 * - Key activity aggregation (Active vs Inactive).
 * - Automatic background data refreshing.
 */
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Data fetcher for all company/user records.
   * @param isAuto - If true, prevents full-screen loading state (for silent refresh).
   */
  const fetchUsers = useCallback(async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const res = await fetch(ENDPOINT, {
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || '',
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.data || []);
      setError(false);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
    
    // Refresh table data every 60 seconds
    const interval = setInterval(() => {
      fetchUsers(true);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchUsers]);

  /**
   * Filtered user list based on Company Name, MRA Username, or EBS ID.
   */
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name?.toLowerCase().includes(query) ||
      user.userName?.toLowerCase().includes(query) ||
      user.ebsId?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  /**
   * Aggregates key counts for a specific company.
   */
  const getUserApiKeyStats = (user: User) => {
    const total = user.apiKeys?.length || 0;
    const active = user.apiKeys?.filter(k => k.isActive).length || 0;
    return { total, active };
  };

  /**
   * Finds the most recent activity timestamp across all keys for a company.
   */
  const getUserLastUsed = (user: User) => {
    if (!user.apiKeys || user.apiKeys.length === 0) return null;
    
    const lastUsedDates = user.apiKeys
      .map(k => k.lastUsedAt)
      .filter(Boolean) as string[];
      
    if (lastUsedDates.length === 0) return null;
    
    return lastUsedDates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
  };

  const handleDeactivate = (userId: string) => {
    // Logic for key deactivation (API placeholder)
    alert(`Deactivating keys for company: ${userId}`);
  };

  return (
    <div className="flex-1 space-y-8 p-8 md:p-10 lg:p-12 max-w-screen-2xl mx-auto font-sans">
      {/* Header section with Search and Creation Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Company Management
            {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h2>
          <p className="text-muted-foreground text-sm">
            Overview of registered companies, their EBS integration IDs, and API key statuses.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, username, EBS ID..."
              className="pl-9 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CreateUserDialog onSuccess={() => fetchUsers(true)} />
        </div>
      </div>

      {/* Main Companies Table */}
      <Card className="border-muted/60 shadow-sm overflow-hidden bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold py-4 px-6 text-foreground">Company Name</TableHead>
                <TableHead className="font-bold py-4 px-6 text-foreground">Username</TableHead>
                <TableHead className="font-bold py-4 px-6 text-foreground">EBS ID</TableHead>
                <TableHead className="font-bold py-4 px-6 text-foreground text-center">Area</TableHead>
                <TableHead className="font-bold py-4 px-6 text-foreground">API Keys</TableHead>
                <TableHead className="font-bold py-4 px-6 text-foreground">Last Used</TableHead>
                <TableHead className="font-bold py-4 px-6 text-foreground">Created At</TableHead>
                <TableHead className="font-bold py-4 px-6 text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton loading state
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j} className="py-4 px-6">
                        <Skeleton className="h-6 w-full max-w-[140px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                // Error display
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-destructive">
                    <div className="flex flex-col items-center gap-2">
                      <p className="font-semibold">Failed to load companies</p>
                      <Button variant="outline" size="sm" onClick={() => fetchUsers()}>
                        Try Again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                // Empty state handler
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic">
                    {searchQuery ? "No companies matching your search" : "No registered companies found"}
                  </TableCell>
                </TableRow>
              ) : (
                // Paginated/Filtered data rows
                filteredUsers.map((user) => {
                  const stats = getUserApiKeyStats(user);
                  const lastUsed = getUserLastUsed(user);
                  
                  return (
                    <TableRow key={user.id} className="group hover:bg-muted/30">
                      <TableCell className="font-semibold text-base py-4 px-6 text-foreground">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground py-4 px-6">{user.userName}</TableCell>
                      <TableCell className="font-mono text-xs py-4 px-6 text-muted-foreground">{user.ebsId}</TableCell>
                      <TableCell className="text-center py-4 px-6 text-base text-muted-foreground">{user.areaCode}</TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="success" className="px-2 py-0.5 text-xs font-bold">
                            {stats.active} Active
                          </Badge>
                          {stats.total - stats.active > 0 && (
                            <Badge variant="destructive" className="px-2 py-0.5 text-xs font-bold">
                              {stats.total - stats.active} Inactive
                            </Badge>
                          )}
                          {stats.total === 0 && (
                            <span className="text-xs text-muted-foreground italic">No keys</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm py-4 px-6 whitespace-nowrap text-muted-foreground">
                        {lastUsed ? formatMauritiusDateTime(lastUsed) : '-'}
                      </TableCell>
                      <TableCell className="text-sm py-4 px-6 whitespace-nowrap text-muted-foreground">
                        {formatMauritiusDateTime(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        {/* Hidden action trigger, visible on row hover */}
                        {stats.active > 0 && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 px-2 text-[10px] font-bold uppercase tracking-widest transition-opacity opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeactivate(user.id)}
                          >
                            <Key className="mr-1 h-3 w-3" />
                            Deactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
