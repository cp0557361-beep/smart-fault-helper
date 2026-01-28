import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Eye,
  Filter,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type EventStatus = 'open' | 'in_review' | 'validated' | 'closed';

interface EventLog {
  id: string;
  description: string | null;
  raw_voice_text: string | null;
  ai_classified_fault: string | null;
  photo_url: string | null;
  status: EventStatus;
  created_at: string;
  machines: {
    name: string;
    machine_type: string;
  } | null;
  production_lines: {
    name: string;
  } | null;
  areas: {
    name: string;
  } | null;
}

const statusConfig: Record<EventStatus, { label: string; icon: React.ElementType; className: string }> = {
  open: { label: 'Abierto', icon: AlertTriangle, className: 'bg-status-fault/20 text-status-fault' },
  in_review: { label: 'En Revisión', icon: Eye, className: 'bg-status-warning/20 text-status-warning' },
  validated: { label: 'Validado', icon: CheckCircle2, className: 'bg-status-ok/20 text-status-ok' },
  closed: { label: 'Cerrado', icon: CheckCircle2, className: 'bg-muted text-muted-foreground' },
};

export default function ReportsPage() {
  const { user, isSupervisor, isAdmin } = useAuth();
  const [reports, setReports] = useState<EventLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<EventStatus | 'all'>('all');

  useEffect(() => {
    loadReports();
  }, [user]);

  const loadReports = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('event_logs')
        .select(`
          id,
          description,
          raw_voice_text,
          ai_classified_fault,
          photo_url,
          status,
          created_at,
          machines (name, machine_type),
          production_lines (name),
          areas (name)
        `)
        .order('created_at', { ascending: false });

      // If not admin/supervisor, only show own reports
      if (!isAdmin && !isSupervisor) {
        query = query.eq('operator_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports((data || []) as EventLog[]);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => r.status === filter);

  const handleExport = () => {
    const csv = [
      ['Fecha', 'Área', 'Línea', 'Equipo', 'Falla', 'Descripción', 'Estado'].join(','),
      ...filteredReports.map(r => [
        new Date(r.created_at).toLocaleString('es-MX'),
        r.areas?.name || '',
        r.production_lines?.name || '',
        r.machines?.name || '',
        r.ai_classified_fault || '',
        (r.description || '').replace(/,/g, ';'),
        statusConfig[r.status].label,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reportes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 lg:pb-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Reportes</h1>
          <p className="text-sm text-muted-foreground">
            {reports.length} reportes en total
          </p>
        </div>
        
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'open', 'in_review', 'validated', 'closed'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
            className="flex-shrink-0"
          >
            {status === 'all' ? 'Todos' : statusConfig[status].label}
          </Button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => {
          const StatusIcon = statusConfig[report.status].icon;
          
          return (
            <Card key={report.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Photo thumbnail */}
                  {report.photo_url && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-secondary">
                      <img 
                        src={report.photo_url} 
                        alt="Evidencia" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground truncate">
                          {report.ai_classified_fault || report.description || 'Sin descripción'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {report.machines?.name} • {report.production_lines?.name}
                        </p>
                      </div>
                      
                      <Badge className={cn('flex-shrink-0', statusConfig[report.status].className)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[report.status].label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(report.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>{report.areas?.name}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredReports.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay reportes {filter !== 'all' ? `con estado "${statusConfig[filter as EventStatus].label}"` : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}
