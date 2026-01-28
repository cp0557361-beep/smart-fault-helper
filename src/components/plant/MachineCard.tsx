import React from 'react';
import { AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { cn } from '@/lib/utils';

type MachineStatus = 'ok' | 'warning' | 'fault';

interface MachineCardProps {
  id: string;
  name: string;
  machineType: string;
  status: MachineStatus;
  sequenceOrder: number;
  onClick: () => void;
}

const machineIcons: Record<string, string> = {
  'Impresora SPI': '🖨️',
  'Pick & Place': '🤖',
  'Horno Reflow': '🔥',
  'Inspección AOI': '👁️',
};

export function MachineCard({
  id,
  name,
  machineType,
  status,
  sequenceOrder,
  onClick,
}: MachineCardProps) {
  const icon = machineIcons[machineType] || '⚙️';

  return (
    <button
      onClick={onClick}
      className={cn(
        'machine-card w-full text-left flex flex-col gap-3',
        status === 'ok' && 'machine-card-ok',
        status === 'fault' && 'machine-card-fault',
        status === 'warning' && 'border-status-warning/50 hover:border-status-warning'
      )}
    >
      {/* Sequence number badge */}
      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center">
        <span className="text-xs font-bold text-muted-foreground">{sequenceOrder}</span>
      </div>

      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        <StatusIndicator status={status} size="md" />
      </div>

      {/* Machine info */}
      <div className="flex items-center gap-3 mt-2">
        <span className="text-3xl">{icon}</span>
        <div>
          <h4 className="font-semibold text-foreground">{name}</h4>
          <p className="text-sm text-muted-foreground">{machineType}</p>
        </div>
      </div>

      {/* Status label */}
      <div className={cn(
        'flex items-center gap-2 mt-auto pt-2 border-t border-border/50',
      )}>
        {status === 'ok' && (
          <>
            <CheckCircle2 className="w-4 h-4 text-status-ok" />
            <span className="text-sm text-status-ok">Operativo</span>
          </>
        )}
        {status === 'fault' && (
          <>
            <AlertTriangle className="w-4 h-4 text-status-fault" />
            <span className="text-sm text-status-fault">Falla Reportada</span>
          </>
        )}
        {status === 'warning' && (
          <>
            <Wrench className="w-4 h-4 text-status-warning" />
            <span className="text-sm text-status-warning">En Revisión</span>
          </>
        )}
      </div>
    </button>
  );
}
