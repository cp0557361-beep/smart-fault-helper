import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Copy, GripVertical, Upload, X, Settings2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MachineSectionsPanel } from '@/components/plant/MachineSectionsPanel';
import { EditSectionAttributesDialog } from '@/components/plant/EditSectionAttributesDialog';

interface LineForm {
  name: string;
  description: string;
  area_id: string;
}

interface MachineForm {
  name: string;
  machine_type: string;
  sequence_order: number;
  image_url?: string;
  serial_number?: string;
  nameplate_image_url?: string;
  [key: string]: string | number | undefined; // For dynamic template attributes
}

interface TemplateAttribute {
  id: string;
  template_id: string;
  section_name: string;
  attribute_name: string;
  attribute_type: string;
  is_required: boolean;
  options: any;
  sequence_order: number;
}

export default function LinesPage() {
  const queryClient = useQueryClient();
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
  const [isMachineDialogOpen, setIsMachineDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<any>(null);
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingNameplate, setUploadingNameplate] = useState(false);
  const [templateAttributes, setTemplateAttributes] = useState<TemplateAttribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [editingAttributesMachine, setEditingAttributesMachine] = useState<{ id: string; name: string } | null>(null);

  const lineForm = useForm<LineForm>({ defaultValues: { name: '', description: '', area_id: '' } });
  const machineForm = useForm<MachineForm>({ defaultValues: { name: '', machine_type: '', sequence_order: 0, serial_number: '', nameplate_image_url: '' } });

  const watchedMachineType = machineForm.watch('machine_type');

  // Fetch template attributes when machine type changes
  useEffect(() => {
    const fetchTemplateAttributes = async () => {
      if (!watchedMachineType) {
        setTemplateAttributes([]);
        return;
      }

      setLoadingAttributes(true);
      try {
        // Get all templates for this machine type
        const { data: templates, error: templatesError } = await supabase
          .from('machine_section_templates')
          .select('id, section_name, sequence_order')
          .eq('machine_type', watchedMachineType)
          .order('sequence_order');

        if (templatesError) throw templatesError;
        if (!templates || templates.length === 0) {
          setTemplateAttributes([]);
          return;
        }

        // Get all attribute definitions for these templates
        const templateIds = templates.map(t => t.id);
        const { data: attributes, error: attrError } = await supabase
          .from('section_attribute_definitions')
          .select('*')
          .in('template_id', templateIds)
          .order('sequence_order');

        if (attrError) throw attrError;

        // Map attributes with section names
        const mappedAttributes: TemplateAttribute[] = (attributes || []).map(attr => {
          const template = templates.find(t => t.id === attr.template_id);
          return {
            id: attr.id,
            template_id: attr.template_id!,
            section_name: template?.section_name || '',
            attribute_name: attr.attribute_name,
            attribute_type: attr.attribute_type,
            is_required: attr.is_required || false,
            options: attr.options,
            sequence_order: attr.sequence_order || 0,
          };
        });

        setTemplateAttributes(mappedAttributes);
      } catch (error) {
        console.error('Error fetching template attributes:', error);
        setTemplateAttributes([]);
      } finally {
        setLoadingAttributes(false);
      }
    };

    fetchTemplateAttributes();
  }, [watchedMachineType]);

  // Check if line name already exists in the same area
  const checkDuplicateLineName = async (name: string, areaId: string, excludeId?: string): Promise<boolean> => {
    let query = supabase
      .from('production_lines')
      .select('id')
      .eq('area_id', areaId)
      .ilike('name', name);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data } = await query;
    return (data?.length || 0) > 0;
  };

  const { data: areas } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('areas').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch machine types from dedicated table
  const { data: machineTypes } = useQuery({
    queryKey: ['machine-types-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_types')
        .select('name')
        .order('name');
      if (error) throw error;
      return data.map((t) => t.name);
    },
  });

  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ['admin-lines', selectedAreaId],
    queryFn: async () => {
      let query = supabase.from('production_lines').select('*, machines(count)').order('sequence_order');
      if (selectedAreaId) query = query.eq('area_id', selectedAreaId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: machines, isLoading: machinesLoading } = useQuery({
    queryKey: ['admin-machines', selectedLineId],
    enabled: !!selectedLineId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('production_line_id', selectedLineId)
        .order('sequence_order');
      if (error) throw error;
      return data;
    },
  });

  // Line mutations
  const createLineMutation = useMutation({
    mutationFn: async (values: LineForm) => {
      // Check for duplicate name
      const isDuplicate = await checkDuplicateLineName(values.name, values.area_id);
      if (isDuplicate) {
        throw new Error('Ya existe una línea con este nombre en el área seleccionada');
      }
      const { error } = await supabase.from('production_lines').insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lines'] });
      toast({ title: 'Línea creada' });
      setIsLineDialogOpen(false);
      lineForm.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateLineMutation = useMutation({
    mutationFn: async ({ id, ...values }: LineForm & { id: string }) => {
      // Check for duplicate name (excluding current line)
      const isDuplicate = await checkDuplicateLineName(values.name, values.area_id, id);
      if (isDuplicate) {
        throw new Error('Ya existe una línea con este nombre en el área seleccionada');
      }
      const { error } = await supabase.from('production_lines').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lines'] });
      toast({ title: 'Línea actualizada' });
      setIsLineDialogOpen(false);
      setEditingLine(null);
      lineForm.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteLineMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('production_lines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lines'] });
      toast({ title: 'Línea eliminada' });
      if (selectedLineId) setSelectedLineId(null);
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const duplicateLineMutation = useMutation({
    mutationFn: async (line: any) => {
      // Create new line
      const { data: newLine, error: lineError } = await supabase
        .from('production_lines')
        .insert({
          name: `${line.name} (copia)`,
          description: line.description,
          area_id: line.area_id,
          sequence_order: (line.sequence_order || 0) + 1,
        })
        .select()
        .single();
      if (lineError) throw lineError;

      // Copy machines
      const { data: lineMachines, error: machinesError } = await supabase
        .from('machines')
        .select('*')
        .eq('production_line_id', line.id);
      if (machinesError) throw machinesError;

      if (lineMachines && lineMachines.length > 0) {
        const newMachines = lineMachines.map((m) => ({
          name: m.name,
          machine_type: m.machine_type,
          production_line_id: newLine.id,
          sequence_order: m.sequence_order,
          image_url: m.image_url,
          serial_number: m.serial_number,
          nameplate_image_url: m.nameplate_image_url,
        }));
        const { error: insertError } = await supabase.from('machines').insert(newMachines);
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lines'] });
      toast({ title: 'Línea duplicada', description: 'La línea y sus equipos han sido copiados.' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Apply template sections and attributes to a machine
  const applyTemplateToMachine = async (machineId: string, machineType: string, attributeValues: Record<string, any>) => {
    // Fetch templates for this machine type
    const { data: templates, error: templatesError } = await supabase
      .from('machine_section_templates')
      .select('*')
      .eq('machine_type', machineType)
      .order('sequence_order');
    if (templatesError) throw templatesError;
    if (!templates || templates.length === 0) return;

    // Create sections for each template
    for (const template of templates) {
      const { data: newSection, error: sectionError } = await supabase
        .from('machine_sections')
        .insert({
          machine_id: machineId,
          template_id: template.id,
          name: template.section_name,
          description: template.description,
          sequence_order: template.sequence_order,
        })
        .select()
        .single();
      if (sectionError) throw sectionError;

      // Fetch attribute definitions for this template
      const { data: attrDefs, error: attrError } = await supabase
        .from('section_attribute_definitions')
        .select('*')
        .eq('template_id', template.id)
        .order('sequence_order');
      if (attrError) throw attrError;

      // Create attribute values for each definition with user-provided values
      if (attrDefs && attrDefs.length > 0) {
        const attrValuesData = attrDefs.map((def) => {
          // Generate key to match form field: attr_{templateId}_{attributeId}
          const fieldKey = `attr_${template.id}_${def.id}`;
          const providedValue = attributeValues[fieldKey];
          return {
            section_id: newSection.id,
            attribute_definition_id: def.id,
            attribute_name: def.attribute_name,
            attribute_value: providedValue || null,
          };
        });
        const { error: insertError } = await supabase.from('section_attribute_values').insert(attrValuesData);
        if (insertError) throw insertError;
      }
    }
  };

  // Machine mutations
  const createMachineMutation = useMutation({
    mutationFn: async (values: MachineForm) => {
      // Extract base machine fields
      const { name, machine_type, sequence_order, image_url, serial_number, nameplate_image_url, ...attributeValues } = values;
      
      // Create machine
      const { data: newMachine, error } = await supabase.from('machines').insert({
        name,
        machine_type,
        sequence_order,
        image_url,
        serial_number,
        nameplate_image_url,
        production_line_id: selectedLineId,
      }).select().single();
      if (error) throw error;

      // Apply template sections if machine type is set
      if (machine_type) {
        await applyTemplateToMachine(newMachine.id, machine_type, attributeValues);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-machines', selectedLineId] });
      toast({ title: 'Equipo creado', description: 'Secciones y atributos aplicados desde la plantilla.' });
      setIsMachineDialogOpen(false);
      machineForm.reset();
      setTemplateAttributes([]);
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateMachineMutation = useMutation({
    mutationFn: async ({ id, ...values }: MachineForm & { id: string }) => {
      const { error } = await supabase.from('machines').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-machines', selectedLineId] });
      toast({ title: 'Equipo actualizado' });
      setIsMachineDialogOpen(false);
      setEditingMachine(null);
      machineForm.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteMachineMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('machines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-machines', selectedLineId] });
      toast({ title: 'Equipo eliminado' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Image upload
  const handleImageUpload = async (file: File, field: 'image_url' | 'nameplate_image_url') => {
    const setUploading = field === 'image_url' ? setUploadingImage : setUploadingNameplate;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const folder = field === 'image_url' ? 'machines' : 'nameplates';
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('evidence-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('evidence-photos').getPublicUrl(filePath);
      machineForm.setValue(field, data.publicUrl);
      toast({ title: 'Imagen subida' });
    } catch (error: any) {
      toast({ title: 'Error al subir imagen', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const onLineSubmit = (values: LineForm) => {
    if (editingLine) {
      updateLineMutation.mutate({ id: editingLine.id, ...values });
    } else {
      createLineMutation.mutate(values);
    }
  };

  const onMachineSubmit = (values: MachineForm) => {
    // Validate required template attributes
    const missingRequired: string[] = [];
    templateAttributes.filter(attr => attr.is_required).forEach(attr => {
      const fieldKey = `attr_${attr.template_id}_${attr.id}`;
      const value = values[fieldKey];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingRequired.push(`${attr.section_name} → ${attr.attribute_name}`);
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

    if (editingMachine) {
      updateMachineMutation.mutate({ id: editingMachine.id, ...values });
    } else {
      createMachineMutation.mutate(values);
    }
  };

  const openLineDialog = (line?: any) => {
    if (line) {
      setEditingLine(line);
      lineForm.reset({ name: line.name, description: line.description || '', area_id: line.area_id });
    } else {
      setEditingLine(null);
      lineForm.reset({ name: '', description: '', area_id: selectedAreaId || '' });
    }
    setIsLineDialogOpen(true);
  };

  const openMachineDialog = (machine?: any) => {
    setTemplateAttributes([]);
    if (machine) {
      setEditingMachine(machine);
      machineForm.reset({
        name: machine.name,
        machine_type: machine.machine_type || '',
        sequence_order: machine.sequence_order || 0,
        image_url: machine.image_url || '',
        serial_number: machine.serial_number || '',
        nameplate_image_url: machine.nameplate_image_url || '',
      });
    } else {
      setEditingMachine(null);
      const nextOrder = machines ? Math.max(...machines.map((m) => m.sequence_order || 0), 0) + 1 : 1;
      machineForm.reset({ name: '', machine_type: '', sequence_order: nextOrder, serial_number: '', nameplate_image_url: '' });
    }
    setIsMachineDialogOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Lines Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Líneas de Producción</CardTitle>
          <Button size="sm" onClick={() => openLineDialog()}>
            <Plus className="w-4 h-4 mr-1" />
            Nueva Línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedAreaId || '__all__'} onValueChange={(val) => setSelectedAreaId(val === '__all__' ? '' : val)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por área..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las áreas</SelectItem>
              {areas?.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {linesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {lines?.map((line) => (
                <div
                  key={line.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedLineId === line.id ? 'bg-primary/10 border-primary' : 'hover:bg-secondary'
                  )}
                  onClick={() => setSelectedLineId(line.id)}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{line.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {areas?.find((a) => a.id === line.area_id)?.name} • {(line.machines as any)?.[0]?.count || 0} equipos
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); duplicateLineMutation.mutate(line); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openLineDialog(line); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar línea?')) deleteLineMutation.mutate(line.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {lines?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay líneas. Crea una nueva.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Machines Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>
            Equipos {selectedLineId && lines?.find((l) => l.id === selectedLineId)?.name && `- ${lines.find((l) => l.id === selectedLineId)?.name}`}
          </CardTitle>
          {selectedLineId && (
            <Button size="sm" onClick={() => openMachineDialog()}>
              <Plus className="w-4 h-4 mr-1" />
              Nuevo Equipo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!selectedLineId ? (
            <p className="text-center text-muted-foreground py-8">Selecciona una línea para ver sus equipos</p>
          ) : machinesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {machines?.map((machine, index) => (
                <div key={machine.id} className="rounded-lg border hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3 p-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-muted rounded text-xs font-medium">
                      {index + 1}
                    </span>
                    {machine.image_url ? (
                      <img src={machine.image_url} alt={machine.name} className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{machine.name}</p>
                      <p className="text-sm text-muted-foreground">{machine.machine_type || 'Sin tipo'}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Editar atributos de secciones"
                        onClick={() => setEditingAttributesMachine({ id: machine.id, name: machine.name })}
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openMachineDialog(machine)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar equipo?')) deleteMachineMutation.mutate(machine.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Machine Sections Panel */}
                  <div className="px-3 pb-3">
                    <MachineSectionsPanel machineId={machine.id} compact />
                  </div>
                </div>
              ))}
              {machines?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay equipos. Agrega uno nuevo.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Dialog */}
      <Dialog open={isLineDialogOpen} onOpenChange={setIsLineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Editar Línea' : 'Nueva Línea'}</DialogTitle>
          </DialogHeader>
          <Form {...lineForm}>
            <form onSubmit={lineForm.handleSubmit(onLineSubmit)} className="space-y-4">
              <FormField
                control={lineForm.control}
                name="area_id"
                rules={{ required: 'Selecciona un área' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar área..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {areas?.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={lineForm.control}
                name="name"
                rules={{ required: 'El nombre es requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Línea SMT-1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={lineForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción de la línea..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsLineDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createLineMutation.isPending || updateLineMutation.isPending}>
                  {(createLineMutation.isPending || updateLineMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingLine ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Machine Dialog */}
      <Dialog open={isMachineDialogOpen} onOpenChange={setIsMachineDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingMachine ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <Form {...machineForm}>
              <form onSubmit={machineForm.handleSubmit(onMachineSubmit)} className="space-y-4">
                <FormField
                  control={machineForm.control}
                  name="name"
                  rules={{ required: 'El nombre es requerido' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Impresora DEK" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={machineForm.control}
                  name="machine_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Equipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {machineTypes?.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                          {(!machineTypes || machineTypes.length === 0) && (
                            <SelectItem value="__empty__" disabled>
                              No hay tipos definidos
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={machineForm.control}
                  name="sequence_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orden en Línea</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={machineForm.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagen del Equipo</FormLabel>
                      <div className="space-y-2">
                        {field.value && (
                          <div className="relative w-32 h-32">
                            <img src={field.value} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 w-6 h-6"
                              onClick={() => machineForm.setValue('image_url', '')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, 'image_url');
                              }}
                              disabled={uploadingImage}
                            />
                          </div>
                        </FormControl>
                        {uploadingImage && <p className="text-sm text-muted-foreground">Subiendo imagen...</p>}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={machineForm.control}
                  name="serial_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Serie</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: SN-12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={machineForm.control}
                  name="nameplate_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foto de Placa del Equipo</FormLabel>
                      <div className="space-y-2">
                        {field.value && (
                          <div className="relative w-32 h-32">
                            <img src={field.value} alt="Placa" className="w-full h-full object-cover rounded-lg" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 w-6 h-6"
                              onClick={() => machineForm.setValue('nameplate_image_url', '')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, 'nameplate_image_url');
                              }}
                              disabled={uploadingNameplate}
                            />
                          </div>
                        </FormControl>
                        {uploadingNameplate && <p className="text-sm text-muted-foreground">Subiendo imagen...</p>}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dynamic Template Attributes */}
                {loadingAttributes && (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Cargando atributos de la plantilla...</span>
                  </div>
                )}

                {!loadingAttributes && templateAttributes.length > 0 && !editingMachine && (
                  <div className="space-y-4 pt-2">
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Atributos del Tipo de Equipo</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Completa los campos requeridos marcados con <span className="text-destructive">*</span>
                      </p>
                    </div>
                    
                    {/* Group attributes by section */}
                    {(() => {
                      const sections = [...new Set(templateAttributes.map(a => a.section_name))];
                      return sections.map(sectionName => {
                        const sectionAttrs = templateAttributes.filter(a => a.section_name === sectionName);
                        return (
                          <div key={sectionName} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {sectionName}
                              </Badge>
                            </div>
                            {sectionAttrs.map(attr => {
                              const fieldKey = `attr_${attr.template_id}_${attr.id}`;
                              return (
                                <FormField
                                  key={attr.id}
                                  control={machineForm.control}
                                  name={fieldKey as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex items-center gap-1">
                                        {attr.attribute_name}
                                        {attr.is_required && <span className="text-destructive">*</span>}
                                      </FormLabel>
                                      <FormControl>
                                        {attr.attribute_type === 'select' && attr.options ? (
                                          <Select 
                                            onValueChange={field.onChange} 
                                            value={field.value as string || ''}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder={`Seleccionar ${attr.attribute_name}...`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {(attr.options as string[]).map((option: string) => (
                                                <SelectItem key={option} value={option}>
                                                  {option}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : attr.attribute_type === 'number' ? (
                                          <Input
                                            type="number"
                                            placeholder={`Ingresar ${attr.attribute_name}...`}
                                            value={field.value as string || ''}
                                            onChange={(e) => field.onChange(e.target.value)}
                                          />
                                        ) : attr.attribute_type === 'textarea' ? (
                                          <Textarea
                                            placeholder={`Ingresar ${attr.attribute_name}...`}
                                            value={field.value as string || ''}
                                            onChange={(e) => field.onChange(e.target.value)}
                                          />
                                        ) : (
                                          <Input
                                            placeholder={`Ingresar ${attr.attribute_name}...`}
                                            value={field.value as string || ''}
                                            onChange={(e) => field.onChange(e.target.value)}
                                          />
                                        )}
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              );
                            })}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsMachineDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMachineMutation.isPending || updateMachineMutation.isPending}>
                    {(createMachineMutation.isPending || updateMachineMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {editingMachine ? 'Guardar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Section Attributes Dialog */}
      {editingAttributesMachine && (
        <EditSectionAttributesDialog
          open={!!editingAttributesMachine}
          onOpenChange={(open) => !open && setEditingAttributesMachine(null)}
          machineId={editingAttributesMachine.id}
          machineName={editingAttributesMachine.name}
        />
      )}
    </div>
  );
}
