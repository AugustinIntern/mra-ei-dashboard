"use client";

/** File: UI/application module for the dashboard project. */

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, RefreshCw, Key, Loader2, Copy, Check } from 'lucide-react';
import { formatMauritiusDateTime } from '@/lib/utils';
import { ApiKey, User } from '@/types';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import { toast } from 'sonner';

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

  const [selectedKeyByUser, setSelectedKeyByUser] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingKeyId, setPendingKeyId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [reactivateConfirmOpen, setReactivateConfirmOpen] = useState(false);
  const [pendingReactivateUserId, setPendingReactivateUserId] = useState<string | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewApiKeyDialog, setShowNewApiKeyDialog] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const nextUsers = Array.isArray(data) ? data : data.data || [];
      setUsers(nextUsers);

      // Keep per-user key selection stable; auto-seed first active key when missing.
      setSelectedKeyByUser((prev) => {
        const next = { ...prev };
        for (const user of nextUsers) {
          const activeKeys = (user.apiKeys || []).filter((k: ApiKey) => k.isActive);
          if (activeKeys.length === 0) {
            delete next[user.id];
            continue;
          }

          const existing = next[user.id];
          const existsAndActive = activeKeys.some((k: ApiKey) => k.id === existing);
          if (!existsAndActive) {
            next[user.id] = activeKeys[0].id;
          }
        }
        return next;
      });

      setError(false);
    } catch {
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

  const getActiveKeys = (user: User): ApiKey[] => {
    return (user.apiKeys || []).filter((key): key is ApiKey => Boolean(key?.id) && key.isActive);
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

  const openDeactivateDialog = (user: User) => {
    const activeKeys = getActiveKeys(user);
    if (activeKeys.length === 0) return;

    const selected = selectedKeyByUser[user.id] && activeKeys.some((k) => k.id === selectedKeyByUser[user.id])
      ? selectedKeyByUser[user.id]
      : activeKeys[0].id;

    setPendingUserId(user.id);
    setPendingKeyId(selected);
    setConfirmOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!pendingKeyId) return;

    setIsDeactivating(true);
    try {
      const res = await fetch(`${API_BASE}/admin/keys/${pendingKeyId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || '',
          'Content-Type': 'application/json',
        },
      });

      let payload: { message?: string; error?: string } | null = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        throw new Error(payload?.message || payload?.error || 'Failed to deactivate API key');
      }

      toast.success('API key deactivated successfully');
      setConfirmOpen(false);
      setPendingKeyId(null);
      setPendingUserId(null);
      await fetchUsers(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate API key';
      toast.error(message);
    } finally {
      setIsDeactivating(false);
    }
  };

  const openReactivateDialog = (userId: string) => {
    setPendingReactivateUserId(userId);
    setReactivateConfirmOpen(true);
  };

  const confirmReactivate = async () => {
    if (!pendingReactivateUserId) return;

    setIsReactivating(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${pendingReactivateUserId}/rotate-key`, {
        method: 'POST',
        headers: {
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label: 'reactivated' }),
      });

      let payload: { message?: string; error?: string; apiKey?: string } | null = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        throw new Error(payload?.message || payload?.error || 'Failed to reactivate API key');
      }

      if (!payload?.apiKey) {
        throw new Error('New API key was not returned by the server');
      }

      setReactivateConfirmOpen(false);
      setNewApiKey(payload.apiKey);
      setShowNewApiKeyDialog(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate API key';
      toast.error(message);
    } finally {
      setIsReactivating(false);
    }
  };

  const handleCopyApiKey = async () => {
    if (!newApiKey) return;
    await navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const pendingUser = useMemo(
    () => users.find((u) => u.id === pendingUserId) || null,
    [users, pendingUserId]
  );

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
                    {searchQuery ? 'No companies matching your search' : 'No registered companies found'}
                  </TableCell>
                </TableRow>
              ) : (
                // Paginated/Filtered data rows
                filteredUsers.map((user) => {
                  const lastUsed = getUserLastUsed(user);
                  const activeKeys = getActiveKeys(user);
                  const hasActiveKey = (user.apiKeys || []).some((k) => k.isActive);
                  const hasKeys = (user.apiKeys || []).length > 0;

                  return (
                    <TableRow key={user.id} className="group hover:bg-muted/30">
                      <TableCell className="font-semibold text-base py-4 px-6 text-foreground">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground py-4 px-6">{user.userName}</TableCell>
                      <TableCell className="font-mono text-xs py-4 px-6 text-muted-foreground">{user.ebsId}</TableCell>
                      <TableCell className="text-center py-4 px-6 text-base text-muted-foreground">{user.areaCode}</TableCell>
                      <TableCell className="py-4 px-6">
                        {!hasKeys ? (
                          <Badge variant="secondary">No Keys</Badge>
                        ) : hasActiveKey ? (
                          <Badge className="bg-green-500 text-white">Active</Badge>
                        ) : (
                          <Badge className="bg-red-500 text-white">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-4 px-6 whitespace-nowrap text-muted-foreground">
                        {lastUsed ? formatMauritiusDateTime(lastUsed) : '-'}
                      </TableCell>
                      <TableCell className="text-sm py-4 px-6 whitespace-nowrap text-muted-foreground">
                        {formatMauritiusDateTime(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        {activeKeys.length === 0 ? (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 px-2 text-[10px] font-bold uppercase tracking-widest bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => openReactivateDialog(user.id)}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {activeKeys.length > 1 && (
                              <Select
                                value={selectedKeyByUser[user.id] || activeKeys[0].id}
                                onValueChange={(value) => {
                                  setSelectedKeyByUser((prev) => ({ ...prev, [user.id]: value }));
                                }}
                              >
                                <SelectTrigger className="h-8 w-[170px] text-xs">
                                  <SelectValue placeholder="Select key" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeKeys.map((key, idx) => (
                                    <SelectItem key={key.id} value={key.id}>
                                      {key.label || `Key ${idx + 1}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 px-2 text-[10px] font-bold uppercase tracking-widest"
                              onClick={() => {
                                if (!selectedKeyByUser[user.id] && activeKeys[0]) {
                                  setSelectedKeyByUser((prev) => ({ ...prev, [user.id]: activeKeys[0].id }));
                                }
                                openDeactivateDialog(user);
                              }}
                            >
                              <Key className="mr-1 h-3 w-3" />
                              Deactivate
                            </Button>
                          </div>
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

      <AlertDialog open={confirmOpen} onOpenChange={(open) => {
        if (isDeactivating) return;
        setConfirmOpen(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this API key? The user will immediately lose access to the API.
            </AlertDialogDescription>
            {pendingUser && pendingKeyId && (
              <p className="text-xs text-muted-foreground pt-1">
                Company: {pendingUser.name} • Key ID: {pendingKeyId}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!isDeactivating) void confirmDeactivate();
              }}
              disabled={isDeactivating || !pendingKeyId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeactivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Confirm Deactivate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reactivateConfirmOpen} onOpenChange={(open) => {
        if (isReactivating) return;
        setReactivateConfirmOpen(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate API Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new API key for this user. They will be able to access the API again. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!isReactivating) void confirmReactivate();
              }}
              disabled={isReactivating || !pendingReactivateUserId}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isReactivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reactivating...
                </>
              ) : (
                'Confirm Reactivate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={showNewApiKeyDialog}
        onOpenChange={(open) => {
          setShowNewApiKeyDialog(open);
          if (!open) {
            setNewApiKey(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="bg-background text-foreground backdrop-blur-none">
          <DialogHeader>
            <DialogTitle>New API Key Generated</DialogTitle>
            <DialogDescription>
              Save this API key now — it will never be shown again
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input readOnly value={newApiKey || ''} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => void handleCopyApiKey()}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setShowNewApiKeyDialog(false);
                setTimeout(() => {
                  void fetchUsers(true);
                }, 0);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
