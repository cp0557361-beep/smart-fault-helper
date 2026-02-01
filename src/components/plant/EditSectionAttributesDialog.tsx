import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EditSectionAttributesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineId: string;
  machineName: string;
}

interface AttributeFormValues {
  [key: string]: string;
}

export function EditSectionAttributesDialog({
  open,
  onOpenChange,
  machineId,
  machineName,
}: EditSectionAttributesDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<AttributeFormValues>({ defaultValues: {} });

  // Fetch machine sections
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['machine-sections-edit', machineId],
    enabled: open && !!machineId,
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

  // Fetch attribute values with definitions
  const { data: attributeValues, isLoading: attributesLoading } = useQuery({
    queryKey: ['section-attribute-values-edit', machineId],
    enabled: open && sectionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('section_attribute_values')
        .select('*, attribute_definition:section_attribute_definitions(*)')
        .in('section_id', sectionIds);
      if (error) throw error;
      return data;
    },
  });

  // Reset form when data changes
  React.useEffect(() => {
    if (attributeValues) {
      const defaultValues: AttributeFormValues = {};
      attributeValues.forEach(attr => {
        defaultValues[`attr_${attr.id}`] = attr.attribute_value || '';
      });
      form.reset(defaultValues);
    }
  }, [attributeValues, form]);

  // Group attributes by section
  const attributesBySection = React.useMemo(() => {
    if (!attributeValues) return {};
    return attributeValues.reduce((acc, attr) => {
      if (!acc[attr.section_id]) acc[attr.section_id] = [];
      acc[attr.section_id].push(attr);
      return acc;
    }, {} as Record<string, typeof attributeValues>);
  }, [attributeValues]);

  // Update mutation
  const updateAttributesMutation = useMutation({
    mutationFn: async (values: AttributeFormValues) => {
      const updates = Object.entries(values).map(([key, value]) => {
        const attrId = key.replace('attr_', '');
        return { id: attrId, attribute_value: value || null };
      });

      for (const update of updates) {
        const { error } = await supabase
          .from('section_attribute_values')
          .update({ attribute_value: update.attribute_value })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-attribute-values'] });
      queryClient.invalidateQueries({ queryKey: ['machine-sections'] });
      toast({ title: 'Atributos actualizados', description: 'Los valores han sido guardados correctamente.' });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (values: AttributeFormValues) => {
    // Validate required fields
    const missingRequired: string[] = [];
    attributeValues?.forEach(attr => {
      if (attr.attribute_definition?.is_required) {
        const value = values[`attr_${attr.id}`];
        if (!value || value.trim() === '') {
          const section = sections?.find(s => s.id === attr.section_id);
          missingRequired.push(`${section?.name || 'Sección'} → ${attr.attribute_name}`);
        }
      }
    });

    if (missingRequired.length > 0) {
      toast({
        title: 'Campos requeridos faltantes',
        description: `Completa: ${missingRequired.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    updateAttributesMutation.mutate(values);
  };

  const isLoading = sectionsLoading || attributesLoading;
  const hasSections = sections && sections.length > 0;

  const renderAttributeField = (attr: NonNullable<typeof attributeValues>[0]) => {
    const fieldKey = `attr_${attr.id}` as const;
    const definition = attr.attribute_definition;
    const attrType = definition?.attribute_type || 'text';
    const options = definition?.options as string[] | null;
    const isRequired = definition?.is_required || false;

    return (
      <FormField
        key={attr.id}
        control={form.control}
        name={fieldKey}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1 text-sm">
              {attr.attribute_name}
              {isRequired && <span className="text-destructive">*</span>}
            </FormLabel>
            <FormControl>
              {attrType === 'select' && options ? (
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((opt: string) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : attrType === 'number' ? (
                <Input
                  type="number"
                  placeholder={`Ingresa ${attr.attribute_name.toLowerCase()}`}
                  {...field}
                />
              ) : attrType === 'textarea' ? (
                <Textarea
                  placeholder={`Ingresa ${attr.attribute_name.toLowerCase()}`}
                  rows={2}
                  {...field}
                />
              ) : (
                <Input
                  placeholder={`Ingresa ${attr.attribute_name.toLowerCase()}`}
                  {...field}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Editar Atributos - {machineName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando secciones y atributos...</span>
          </div>
        ) : !hasSections ? (
          <div className="text-center py-8 text-muted-foreground">
            Este equipo no tiene secciones definidas. Asegúrate de que tenga un tipo de equipo con plantilla asociada.
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {sections?.map((section, index) => {
                  const sectionAttrs = attributesBySection[section.id] || [];
                  
                  return (
                    <div key={section.id}>
                      {index > 0 && <Separator className="mb-4" />}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-base">{section.name}</h4>
                          {section.status && section.status !== 'ok' && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                section.status === 'warning' && 'bg-status-warning/10 text-status-warning border-status-warning/30',
                                section.status === 'fault' && 'bg-status-fault/10 text-status-fault border-status-fault/30'
                              )}
                            >
                              {section.status === 'warning' ? 'Revisión' : 'Falla'}
                            </Badge>
                          )}
                        </div>
                        {section.description && (
                          <p className="text-sm text-muted-foreground">{section.description}</p>
                        )}
                        
                        {sectionAttrs.length > 0 ? (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {sectionAttrs.map(renderAttributeField)}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Esta sección no tiene atributos definidos.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                <Separator />
                
                <div className="flex justify-end gap-2 pb-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateAttributesMutation.isPending}>
                    {updateAttributesMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
