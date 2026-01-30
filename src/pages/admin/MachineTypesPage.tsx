import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Settings2, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface TemplateForm {
  machine_type: string;
  section_name: string;
  description: string;
  sequence_order: number;
}

interface AttributeForm {
  attribute_name: string;
  attribute_type: string;
  is_required: boolean;
  sequence_order: number;
}

const ATTRIBUTE_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Sí/No' },
  { value: 'date', label: 'Fecha' },
  { value: 'select', label: 'Selección' },
];

export default function MachineTypesPage() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isAttributeDialogOpen, setIsAttributeDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingAttribute, setEditingAttribute] = useState<any>(null);

  const templateForm = useForm<TemplateForm>({
    defaultValues: { machine_type: '', section_name: '', description: '', sequence_order: 0 },
  });

  const attributeForm = useForm<AttributeForm>({
    defaultValues: { attribute_name: '', attribute_type: 'text', is_required: false, sequence_order: 0 },
  });

  // Fetch unique machine types
  const { data: machineTypes } = useQuery({
    queryKey: ['machine-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_section_templates')
        .select('machine_type')
        .order('machine_type');
      if (error) throw error;
      const unique = [...new Set(data.map((t) => t.machine_type))];
      return unique;
    },
  });

  // Fetch templates for selected type
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['section-templates', selectedType],
    enabled: !!selectedType,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_section_templates')
        .select('*')
        .eq('machine_type', selectedType)
        .order('sequence_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch attributes for selected template
  const { data: attributes, isLoading: attributesLoading } = useQuery({
    queryKey: ['section-attributes', selectedTemplateId],
    enabled: !!selectedTemplateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('section_attribute_definitions')
        .select('*')
        .eq('template_id', selectedTemplateId)
        .order('sequence_order');
      if (error) throw error;
      return data;
    },
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (values: TemplateForm) => {
      const { error } = await supabase.from('machine_section_templates').insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-templates'] });
      queryClient.invalidateQueries({ queryKey: ['machine-types'] });
      toast({ title: 'Sección creada' });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...values }: TemplateForm & { id: string }) => {
      const { error } = await supabase.from('machine_section_templates').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-templates'] });
      queryClient.invalidateQueries({ queryKey: ['machine-types'] });
      toast({ title: 'Sección actualizada' });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      templateForm.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('machine_section_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-templates'] });
      queryClient.invalidateQueries({ queryKey: ['machine-types'] });
      toast({ title: 'Sección eliminada' });
      if (selectedTemplateId) setSelectedTemplateId(null);
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Attribute mutations
  const createAttributeMutation = useMutation({
    mutationFn: async (values: AttributeForm) => {
      const { error } = await supabase.from('section_attribute_definitions').insert({
        ...values,
        template_id: selectedTemplateId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-attributes', selectedTemplateId] });
      toast({ title: 'Atributo creado' });
      setIsAttributeDialogOpen(false);
      attributeForm.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateAttributeMutation = useMutation({
    mutationFn: async ({ id, ...values }: AttributeForm & { id: string }) => {
      const { error } = await supabase.from('section_attribute_definitions').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-attributes', selectedTemplateId] });
      toast({ title: 'Atributo actualizado' });
      setIsAttributeDialogOpen(false);
      setEditingAttribute(null);
      attributeForm.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteAttributeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('section_attribute_definitions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-attributes', selectedTemplateId] });
      toast({ title: 'Atributo eliminado' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const openTemplateDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      templateForm.reset({
        machine_type: template.machine_type,
        section_name: template.section_name,
        description: template.description || '',
        sequence_order: template.sequence_order || 0,
      });
    } else {
      setEditingTemplate(null);
      const nextOrder = templates ? Math.max(...templates.map((t) => t.sequence_order || 0), 0) + 1 : 1;
      templateForm.reset({
        machine_type: selectedType || '',
        section_name: '',
        description: '',
        sequence_order: nextOrder,
      });
    }
    setIsTemplateDialogOpen(true);
  };

  const openAttributeDialog = (attribute?: any) => {
    if (attribute) {
      setEditingAttribute(attribute);
      attributeForm.reset({
        attribute_name: attribute.attribute_name,
        attribute_type: attribute.attribute_type,
        is_required: attribute.is_required || false,
        sequence_order: attribute.sequence_order || 0,
      });
    } else {
      setEditingAttribute(null);
      const nextOrder = attributes ? Math.max(...attributes.map((a) => a.sequence_order || 0), 0) + 1 : 1;
      attributeForm.reset({
        attribute_name: '',
        attribute_type: 'text',
        is_required: false,
        sequence_order: nextOrder,
      });
    }
    setIsAttributeDialogOpen(true);
  };

  const onTemplateSubmit = (values: TemplateForm) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, ...values });
    } else {
      createTemplateMutation.mutate(values);
    }
  };

  const onAttributeSubmit = (values: AttributeForm) => {
    if (editingAttribute) {
      updateAttributeMutation.mutate({ id: editingAttribute.id, ...values });
    } else {
      createAttributeMutation.mutate(values);
    }
  };

  const selectedTemplateName = templates?.find((t) => t.id === selectedTemplateId)?.section_name;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plantillas de Secciones</h2>
          <p className="text-muted-foreground">
            Define las secciones y atributos para cada tipo de equipo
          </p>
        </div>
        <Button onClick={() => openTemplateDialog()}>
          <Plus className="w-4 h-4 mr-1" />
          Nueva Sección
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tipos de Equipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {machineTypes?.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setSelectedTemplateId(null);
                }}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left',
                  selectedType === type ? 'bg-primary/10 border-primary' : 'hover:bg-secondary'
                )}
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{type}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
            {(!machineTypes || machineTypes.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                No hay tipos definidos. Crea una sección para agregar un tipo.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sections for Selected Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Secciones {selectedType && `- ${selectedType}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedType ? (
              <p className="text-center text-muted-foreground py-4">
                Selecciona un tipo de equipo
              </p>
            ) : templatesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {templates?.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedTemplateId === template.id ? 'bg-primary/10 border-primary' : 'hover:bg-secondary'
                    )}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <div>
                      <p className="font-medium">{template.section_name}</p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTemplateDialog(template);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('¿Eliminar sección?')) deleteTemplateMutation.mutate(template.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {templates?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No hay secciones para este tipo
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attributes for Selected Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">
              Atributos {selectedTemplateName && `- ${selectedTemplateName}`}
            </CardTitle>
            {selectedTemplateId && (
              <Button size="sm" onClick={() => openAttributeDialog()}>
                <Plus className="w-4 h-4 mr-1" />
                Nuevo
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedTemplateId ? (
              <p className="text-center text-muted-foreground py-4">
                Selecciona una sección
              </p>
            ) : attributesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {attributes?.map((attr) => (
                  <div key={attr.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{attr.attribute_name}</p>
                        {attr.is_required && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                            Requerido
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ATTRIBUTE_TYPES.find((t) => t.value === attr.attribute_type)?.label || attr.attribute_type}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openAttributeDialog(attr)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('¿Eliminar atributo?')) deleteAttributeMutation.mutate(attr.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {attributes?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No hay atributos definidos
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Editar Sección' : 'Nueva Sección'}</DialogTitle>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
              <FormField
                control={templateForm.control}
                name="machine_type"
                rules={{ required: 'El tipo de equipo es requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Equipo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: SPI, Horno, Siplace, AOI..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={templateForm.control}
                name="section_name"
                rules={{ required: 'El nombre de sección es requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Sección</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Gantry 1, Zona de Reflujo, Motor..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={templateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción de la sección..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={templateForm.control}
                name="sequence_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                >
                  {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  {editingTemplate ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Attribute Dialog */}
      <Dialog open={isAttributeDialogOpen} onOpenChange={setIsAttributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAttribute ? 'Editar Atributo' : 'Nuevo Atributo'}</DialogTitle>
          </DialogHeader>
          <Form {...attributeForm}>
            <form onSubmit={attributeForm.handleSubmit(onAttributeSubmit)} className="space-y-4">
              <FormField
                control={attributeForm.control}
                name="attribute_name"
                rules={{ required: 'El nombre es requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Atributo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Temperatura, Velocidad, Presión..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={attributeForm.control}
                name="attribute_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Dato</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ATTRIBUTE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={attributeForm.control}
                name="is_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Campo requerido</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={attributeForm.control}
                name="sequence_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAttributeDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createAttributeMutation.isPending || updateAttributeMutation.isPending}
                >
                  {(createAttributeMutation.isPending || updateAttributeMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  {editingAttribute ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
