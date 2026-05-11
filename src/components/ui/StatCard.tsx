/** File: Reusable KPI card used by dashboard pages to render metric tiles with optional states. */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DashboardStat } from '@/types';

interface StatCardProps extends DashboardStat {
  icon?: React.ReactNode;
  valueClassName?: string;
  extraContent?: React.ReactNode;
  badge?: React.ReactNode;
}

/**
 * Displays a metric card with loading/error/normal variants and optional adornments.
 * @param props Metric content and rendering options.
 * @returns Styled dashboard stat card.
 */
export function StatCard({
  title,
  value,
  description,
  loading,
  error,
  icon,
  valueClassName,
  extraContent,
  badge,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden group shadow-sm transition-all hover:shadow-md border-muted/60 bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground transition-colors group-hover:bg-primary/5 group-hover:text-primary">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3 mt-1">
            <Skeleton className="h-10 w-[60%]" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        ) : error ? (
          <div className="text-sm rounded-lg bg-destructive/10 p-3 text-destructive mt-1 border border-destructive/20 font-medium">
            Failed to load data. Retrying...
          </div>
        ) : (
          <div className="flex flex-col space-y-1 mt-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-3xl font-bold tracking-tight", valueClassName)}>{value}</span>
              {badge && <div>{badge}</div>}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {extraContent && <div className="mt-5">{extraContent}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
