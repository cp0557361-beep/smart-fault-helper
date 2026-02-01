import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MachineSectionsPanel } from './MachineSectionsPanel';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Loader2, Hash, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface MachineDetailSheetProps {
  machineId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportFault?: (machineId: string) => void;
}

export function MachineDetailSheet({ machineId, open, onOpenChange, onReportFault }: MachineDetailSheetProps) {
  const { data: machine, isLoading } = useQuery({
    queryKey: ['machine-detail', machineId],
    enabled: !!machineId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*, production_lines(name, areas(name))')
        .eq('id', machineId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {machine?.name || 'Detalles del Equipo'}
            {machine?.status && (
              <StatusIndicator status={machine.status as 'ok' | 'warning' | 'fault'} size="md" />
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-6rem)] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : machine ? (
            <div className="space-y-6 pt-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Información General
                </h4>
                
                {machine.image_url && (
                  <img 
                    src={machine.image_url} 
                    alt={machine.name} 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge variant="secondary">{machine.machine_type || 'No definido'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Línea</span>
                    <span className="font-medium">{(machine.production_lines as any)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Área</span>
                    <span className="font-medium">{(machine.production_lines as any)?.areas?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orden</span>
                    <span className="font-medium">#{machine.sequence_order}</span>
                  </div>
                </div>

                {machine.serial_number && (
                  <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Serie:</span>{' '}
                      <span className="font-mono font-medium">{machine.serial_number}</span>
                    </span>
                  </div>
                )}

                {machine.nameplate_image_url && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="w-4 h-4" />
                      <span>Placa del equipo</span>
                    </div>
                    <img 
                      src={machine.nameplate_image_url} 
                      alt="Placa" 
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Technical Sections */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Configuración Técnica
                </h4>
                <MachineSectionsPanel machineId={machine.id} defaultOpen />
              </div>

              {/* Report Button */}
              {onReportFault && (
                <>
                  <Separator />
                  <Button 
                    className="w-full gap-2" 
                    variant="destructive"
                    onClick={() => onReportFault(machine.id)}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Reportar Falla
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No se encontró el equipo
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
