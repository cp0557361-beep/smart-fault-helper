import React from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { MachineCard } from './MachineCard';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type MachineStatus = 'ok' | 'warning' | 'fault';

interface Machine {
  id: string;
  name: string;
  machine_type: string;
  status: MachineStatus;
  sequence_order: number;
}

interface ProductionLineProps {
  id: string;
  name: string;
  machines: Machine[];
  onMachineClick: (machineId: string) => void;
}

export function ProductionLine({
  id,
  name,
  machines,
  onMachineClick,
}: ProductionLineProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const sortedMachines = [...machines].sort((a, b) => a.sequence_order - b.sequence_order);
  const hasFaults = machines.some(m => m.status === 'fault');
  const hasWarnings = machines.some(m => m.status === 'warning');
  
  const lineStatus = hasFaults ? 'fault' : hasWarnings ? 'warning' : 'ok';

  return (
    <div className={cn(
      'rounded-xl border-2 overflow-hidden transition-all',
      hasFaults ? 'border-status-fault/30 bg-status-fault/5' : 'border-border bg-card'
    )}>
      {/* Line Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors touch-manipulation"
      >
        <div className="flex items-center gap-3">
          <StatusIndicator status={lineStatus} size="md" />
          <h3 className="text-lg font-semibold text-foreground">{name}</h3>
          <span className="text-sm text-muted-foreground">
            ({machines.length} equipos)
          </span>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Machines Flow */}
      {isExpanded && (
        <div className="p-4 pt-0">
          {/* Desktop: Horizontal flow */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2">
            {sortedMachines.map((machine, index) => (
              <React.Fragment key={machine.id}>
                <div className="flex-shrink-0 w-48">
                  <MachineCard
                    id={machine.id}
                    name={machine.name}
                    machineType={machine.machine_type}
                    status={machine.status}
                    sequenceOrder={machine.sequence_order}
                    onClick={() => onMachineClick(machine.id)}
                  />
                </div>
                {index < sortedMachines.length - 1 && (
                  <ArrowRight className="flex-shrink-0 w-6 h-6 text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile: Vertical grid */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {sortedMachines.map((machine) => (
              <MachineCard
                key={machine.id}
                id={machine.id}
                name={machine.name}
                machineType={machine.machine_type}
                status={machine.status}
                sequenceOrder={machine.sequence_order}
                onClick={() => onMachineClick(machine.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
