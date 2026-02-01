import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaBlock } from '@/components/plant/AreaBlock';
import { ProductionLine } from '@/components/plant/ProductionLine';
import { SmartCaptureForm } from '@/components/capture/SmartCaptureForm';
import { MachineDetailSheet } from '@/components/plant/MachineDetailSheet';
import { useReportContext } from '@/hooks/useReportContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type MachineStatus = 'ok' | 'warning' | 'fault';

interface Area {
  id: string;
  name: string;
  description: string | null;
}

interface ProductionLineData {
  id: string;
  name: string;
  area_id: string;
  sequence_order: number;
}

interface Machine {
  id: string;
  name: string;
  machine_type: string;
  status: MachineStatus;
  sequence_order: number;
  production_line_id: string;
}

interface AreaStats {
  linesCount: number;
  machinesCount: number;
  faultCount: number;
}

type ViewState = 'areas' | 'lines' | 'capture';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { savedContext, getMostCommonContext } = useReportContext();

  const [viewState, setViewState] = useState<ViewState>('areas');
  const [areas, setAreas] = useState<Area[]>([]);
  const [lines, setLines] = useState<ProductionLineData[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [areaStats, setAreaStats] = useState<Record<string, AreaStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailMachineId, setDetailMachineId] = useState<string | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load areas
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .order('name');

      if (areasError) throw areasError;
      setAreas(areasData || []);

      // Load all lines and machines for stats
      const { data: linesData } = await supabase
        .from('production_lines')
        .select('*')
        .order('sequence_order');

      const { data: machinesData } = await supabase
        .from('machines')
        .select('*')
        .order('sequence_order');

      setLines(linesData || []);
      setMachines((machinesData || []) as Machine[]);

      // Calculate stats per area
      const stats: Record<string, AreaStats> = {};
      for (const area of areasData || []) {
        const areaLines = (linesData || []).filter(l => l.area_id === area.id);
        const lineMachines = (machinesData || []).filter(m => 
          areaLines.some(l => l.id === m.production_line_id)
        );
        const faults = lineMachines.filter(m => m.status === 'fault');

        stats[area.id] = {
          linesCount: areaLines.length,
          machinesCount: lineMachines.length,
          faultCount: faults.length,
        };
      }
      setAreaStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleAreaClick = (area: Area) => {
    setSelectedArea(area);
    setViewState('lines');
  };

  const handleMachineClick = (machineId: string) => {
    // Show machine detail sheet instead of going to capture form
    setDetailMachineId(machineId);
    setIsDetailSheetOpen(true);
  };

  const handleMachineCaptureClick = (machineId: string) => {
    const machine = machines.find(m => m.id === machineId);
    if (machine) {
      setSelectedMachine(machine);
      setViewState('capture');
    }
  };

  const handleBack = () => {
    if (viewState === 'capture') {
      setSelectedMachine(null);
      setViewState('lines');
    } else if (viewState === 'lines') {
      setSelectedArea(null);
      setViewState('areas');
    }
  };

  const handleCaptureSuccess = () => {
    setSelectedMachine(null);
    setViewState('lines');
    loadData(); // Refresh to show updated machine status
  };

  const handleQuickReport = () => {
    const common = getMostCommonContext();
    if (common) {
      const area = areas.find(a => a.id === common.areaId);
      const machine = machines.find(m => m.id === common.machineId);
      if (area && machine) {
        setSelectedArea(area);
        setSelectedMachine(machine);
        setViewState('capture');
        toast({
          title: 'Contexto cargado',
          description: `${machine.name} en ${common.lineName}`,
        });
      }
    }
  };

  // Callback for starting capture from detail sheet
  const handleStartCapture = (machineId: string) => {
    const machine = machines.find(m => m.id === machineId);
    if (machine) {
      const line = lines.find(l => l.id === machine.production_line_id);
      if (line) {
        const area = areas.find(a => a.id === line.area_id);
        if (area) {
          setSelectedArea(area);
        }
      }
      setSelectedMachine(machine);
      setIsDetailSheetOpen(false);
      setViewState('capture');
    }
  };

  // Get lines for selected area
  const areaLines = selectedArea 
    ? lines.filter(l => l.area_id === selectedArea.id)
    : [];

  // Get the line for selected machine
  const selectedLine = selectedMachine 
    ? lines.find(l => l.id === selectedMachine.production_line_id)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando planta...</p>
        </div>
      </div>
    );
  }

  // Capture Form View
  if (viewState === 'capture' && selectedMachine && selectedLine && selectedArea) {
    return (
      <SmartCaptureForm
        machineId={selectedMachine.id}
        machineName={selectedMachine.name}
        machineType={selectedMachine.machine_type}
        lineId={selectedLine.id}
        lineName={selectedLine.name}
        areaId={selectedArea.id}
        areaName={selectedArea.name}
        onSuccess={handleCaptureSuccess}
        onCancel={handleBack}
      />
    );
  }

  return (
    <div className="p-4 pb-24 lg:pb-4 space-y-6">
      {/* Machine Detail Sheet */}
      <MachineDetailSheet 
        machineId={detailMachineId}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        onReportFault={handleStartCapture}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {viewState === 'lines' && (
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {viewState === 'areas' ? 'Vista de Planta' : selectedArea?.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {viewState === 'areas' 
                ? 'Selecciona un área para ver sus líneas'
                : `${areaLines.length} líneas de producción`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
          </Button>
          
          {getMostCommonContext() && viewState === 'areas' && (
            <Button onClick={handleQuickReport} className="gap-2">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Reporte Rápido</span>
            </Button>
          )}
        </div>
      </div>

      {/* Areas View */}
      {viewState === 'areas' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <AreaBlock
              key={area.id}
              id={area.id}
              name={area.name}
              description={area.description || undefined}
              linesCount={areaStats[area.id]?.linesCount || 0}
              machinesCount={areaStats[area.id]?.machinesCount || 0}
              faultCount={areaStats[area.id]?.faultCount || 0}
              onClick={() => handleAreaClick(area)}
            />
          ))}
          
          {areas.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <p>No hay áreas configuradas.</p>
              <p className="text-sm">Contacta al administrador para configurar la planta.</p>
            </div>
          )}
        </div>
      )}

      {/* Lines View */}
      {viewState === 'lines' && selectedArea && (
        <div className="space-y-4">
          {areaLines.map((line) => {
            const lineMachines = machines.filter(m => m.production_line_id === line.id);
            return (
              <ProductionLine
                key={line.id}
                id={line.id}
                name={line.name}
                machines={lineMachines}
                onMachineClick={handleMachineClick}
              />
            );
          })}

          {areaLines.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay líneas configuradas en esta área.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
