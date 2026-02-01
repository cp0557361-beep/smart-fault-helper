import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronUp, Loader2, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface MachineSectionsPanelProps {
  machineId: string;
  machineName?: string;
  defaultOpen?: boolean;
  compact?: boolean;
}

export function MachineSectionsPanel({ 
  machineId, 
  machineName,
  defaultOpen = false,
  compact = false 
}: MachineSectionsPanelProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  // Fetch machine sections
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['machine-sections', machineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_sections')
        .select('*')
        .eq('machine_id', machineId)
        .order('sequence_order');
      if (error) throw error;
      return data;
    },
  });

  const sectionIds = sections?.map(s => s.id) || [];
  
  // Fetch attribute values for all sections
  const { data: attributeValues, isLoading: attributesLoading } = useQuery({
    queryKey: ['section-attribute-values', machineId],
    enabled: sectionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('section_attribute_values')
        .select('*, attribute_definition:section_attribute_definitions(*)')
        .in('section_id', sectionIds);
      if (error) throw error;
      return data;
    },
  });

  // Group attribute values by section - must be before any returns
  const attributesBySection = React.useMemo(() => {
    if (!attributeValues) return {};
    return attributeValues.reduce((acc, attr) => {
      if (!acc[attr.section_id]) acc[attr.section_id] = [];
      acc[attr.section_id].push(attr);
      return acc;
    }, {} as Record<string, typeof attributeValues>);
  }, [attributeValues]);

  const isLoading = sectionsLoading || attributesLoading;
  const hasSections = sections && sections.length > 0;

  if (!hasSections && !isLoading) {
    return null;
  }

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-2 text-sm hover:bg-secondary/50 rounded transition-colors">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">
                Secciones ({sections?.length || 0})
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando...
            </div>
          ) : (
            <div className="space-y-3">
              {sections?.map((section) => (
                <SectionCard 
                  key={section.id} 
                  section={section} 
                  attributes={attributesBySection[section.id] || []}
                  compact
                />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="space-y-4">
      {machineName && (
        <h4 className="font-semibold text-sm text-foreground">
          Configuración Técnica de {machineName}
        </h4>
      )}
      
      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando secciones y atributos...
        </div>
      ) : (
        <div className="grid gap-3">
          {sections?.map((section) => (
            <SectionCard 
              key={section.id} 
              section={section} 
              attributes={attributesBySection[section.id] || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SectionCardProps {
  section: {
    id: string;
    name: string;
    description: string | null;
    status: string | null;
  };
  attributes: Array<{
    id: string;
    attribute_name: string;
    attribute_value: string | null;
    attribute_definition: {
      is_required: boolean;
      attribute_type: string;
    } | null;
  }>;
  compact?: boolean;
}

function SectionCard({ section, attributes, compact = false }: SectionCardProps) {
  const statusColors: Record<string, string> = {
    ok: 'bg-status-ok/10 text-status-ok border-status-ok/30',
    warning: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    fault: 'bg-status-fault/10 text-status-fault border-status-fault/30',
  };

  if (compact) {
    return (
      <div className="border rounded-lg p-2 bg-secondary/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">{section.name}</span>
          {section.status && section.status !== 'ok' && (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusColors[section.status])}>
              {section.status}
            </Badge>
          )}
        </div>
        {attributes.length > 0 && (
          <div className="space-y-0.5">
            {attributes.map((attr) => (
              <div key={attr.id} className="flex justify-between text-[11px]">
                <span className="text-muted-foreground truncate max-w-[60%]">{attr.attribute_name}</span>
                <span className="text-foreground font-medium truncate max-w-[38%]">
                  {attr.attribute_value || '-'}
                </span>
              </div>
            ))}
          </div>
        )}
        {attributes.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">Sin atributos</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'border rounded-lg p-3',
      section.status && statusColors[section.status] ? statusColors[section.status] : 'border-border'
    )}>
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-medium text-sm">{section.name}</h5>
        {section.status && (
          <Badge variant="outline" className={cn('text-xs', statusColors[section.status])}>
            {section.status === 'ok' ? 'OK' : section.status === 'warning' ? 'Revisión' : 'Falla'}
          </Badge>
        )}
      </div>
      
      {section.description && (
        <p className="text-xs text-muted-foreground mb-2">{section.description}</p>
      )}
      
      {attributes.length > 0 ? (
        <div className="grid gap-1.5">
          {attributes.map((attr) => (
            <div key={attr.id} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                {attr.attribute_name}
                {attr.attribute_definition?.is_required && (
                  <span className="text-destructive">*</span>
                )}
              </span>
              <span className="font-medium text-foreground">
                {attr.attribute_value || <span className="text-muted-foreground italic">No definido</span>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sin atributos definidos</p>
      )}
    </div>
  );
}
