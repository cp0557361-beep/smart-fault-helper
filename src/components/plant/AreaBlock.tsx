import React from 'react';
import { ChevronRight, Factory } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { cn } from '@/lib/utils';

interface AreaBlockProps {
  id: string;
  name: string;
  description?: string;
  linesCount: number;
  machinesCount: number;
  faultCount: number;
  onClick: () => void;
}

export function AreaBlock({
  id,
  name,
  description,
  linesCount,
  machinesCount,
  faultCount,
  onClick,
}: AreaBlockProps) {
  const hasActiveFaults = faultCount > 0;
  const status = hasActiveFaults ? 'fault' : 'ok';

  return (
    <button
      onClick={onClick}
      className={cn(
        'area-block w-full text-left group',
        hasActiveFaults && 'border-status-fault/50 glow-fault'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-3 rounded-lg',
            hasActiveFaults ? 'bg-status-fault/20' : 'bg-primary/20'
          )}>
            <Factory className={cn(
              'w-6 h-6',
              hasActiveFaults ? 'text-status-fault' : 'text-primary'
            )} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">{name}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} size="lg" />
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 mt-4 pt-4 border-t border-border/50">
        <div>
          <p className="text-2xl font-bold text-foreground">{linesCount}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Líneas</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{machinesCount}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Equipos</p>
        </div>
        {hasActiveFaults && (
          <div>
            <p className="text-2xl font-bold text-status-fault">{faultCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Fallas</p>
          </div>
        )}
      </div>
    </button>
  );
}
