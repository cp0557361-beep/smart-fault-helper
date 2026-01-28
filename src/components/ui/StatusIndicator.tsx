import React from 'react';
import { cn } from '@/lib/utils';

type Status = 'ok' | 'warning' | 'fault';

interface StatusIndicatorProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function StatusIndicator({ 
  status, 
  size = 'md', 
  pulse = true,
  className 
}: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        sizeClasses[size],
        status === 'ok' && 'status-indicator-ok',
        status === 'warning' && 'status-indicator-warning',
        status === 'fault' && 'status-indicator-fault',
        !pulse && 'animation-none',
        className
      )}
      aria-label={`Estado: ${status}`}
    />
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const labels = {
    ok: 'Operativo',
    warning: 'Advertencia',
    fault: 'Falla',
  };

  return (
    <div className="flex items-center gap-2">
      <StatusIndicator status={status} size="sm" />
      <span className={cn(
        'text-sm font-medium',
        status === 'ok' && 'text-status-ok',
        status === 'warning' && 'text-status-warning',
        status === 'fault' && 'text-status-fault',
      )}>
        {labels[status]}
      </span>
    </div>
  );
}
