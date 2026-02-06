import React from 'react';
import { AlertTriangle, Wrench } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { cn } from '@/lib/utils';

type MachineStatus = 'ok' | 'warning' | 'fault';

interface MachineCardProps {
  id: string;
  name: string;
  machineType: string;
  status: MachineStatus;
  sequenceOrder: number;
  sequences?: string[];
  onClick: () => void;
}

// const machineIcons: Record<string, string> = {
//   'Impresora SPI': '🖨️',
//   'Pick & Place': '🤖',
//   'Horno Reflow': '🔥',
//   'Inspección AOI': '👁️',
// };
const machineIcons: Record<string, string> = {
  'Cargador de magazines': '📂',
  'Cargador de tablilla virgen': '📥',
  'Laser': '✨',
  'PCB Cleaner': '🧽',
  'Shuttle': '🔃',
  'Suttle despues de horno': '🔃',
  'DEK 1': '🖨️',
  'DEK 2': '🖨️',
  'PARMI': '👁️',
  'Siplace Sec. 50': '🧩',
  'Siplace Sec. 50-1': '🧩',
  'Siplace Sec. 50-2': '🧩',
  'Siplace Sec. 50-3': '🧩',
  'Siplace Sec. 50-4': '🧩',
  'AOI': '🔍',
  'AOI - Rayos X': '🔍',
  'Rayos X': '⚛️',
  'Conveyor de clasificacion SPI': '🔀',
  'Conveyor de clasificacion AOI': '🔀',
  'Conveyor': '➡️',
  'Buffer': '🗄️',
  'Descargador de magazines': '📤',
};




export function MachineCard({
  id,
  name,
  machineType,
  status,
  sequenceOrder,
  sequences,
  onClick,
}: MachineCardProps) {
  const icon = machineIcons[machineType] || '⚙️';

  return (
    <button
      onClick={onClick}
      className={cn(
        'machine-card w-full text-left flex flex-col gap-2',
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
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-foreground truncate">{name}</h4>
          <p className="text-sm text-muted-foreground truncate">{machineType}</p>
        </div>
      </div>

      {/* Sequences display */}
      {sequences && sequences.length > 0 && (
        <div className="text-xs text-muted-foreground/70 truncate">
          Sec: {sequences.join(', ')}
        </div>
      )}

      {/* Status label - Only show when fault or warning */}
      {(status === 'fault' || status === 'warning') && (
        <div className={cn(
          'flex items-center gap-2 mt-auto pt-2 border-t border-border/50',
        )}>
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
      )}
    </button>
  );
}
