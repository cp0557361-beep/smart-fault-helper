import { useState } from 'react';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Settings2, ChevronRight, X, Copy, GripVertical } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { SequenceChips } from '@/components/ui/SequenceChips';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableItem } from '@/components/ui/SortableItem';

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
  options: string[];
}

const ATTRIBUTE_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Sí/No' },
  { value: 'date', label: 'Fecha' },
  { value: 'select', label: 'Selección' },
  { value: 'textarea', label: 'Texto largo' },
];

export default function MachineTypesPage() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isAttributeDialogOpen, setIsAttributeDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingAttribute, setEditingAttribute] = useState<any>(null);
  const [newOptionValue, setNewOptionValue] = useState('');
  
  // State for machine type dialogs
  const [isMachineTypeDialogOpen, setIsMachineTypeDialogOpen] = useState(false);
  const [machineTypeDialogMode, setMachineTypeDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [machineTypeToEdit, setMachineTypeToEdit] = useState<string | null>(null);
  const [machineTypeToEditId, setMachineTypeToEditId] = useState<string | null>(null);
  const [newMachineTypeName, setNewMachineTypeName] = useState('');
  const [newMachineTypeSequences, setNewMachineTypeSequences] = useState<string[]>([]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const templateForm = useForm<TemplateForm>({
    defaultValues: { machine_type: '', section_name: '', description: '', sequence_order: 0 },
  });

  const attributeForm = useForm<AttributeForm>({
    defaultValues: { attribute_name: '', attribute_type: 'text', is_required: false, sequence_order: 0, options: [] },
  });

  const watchedAttributeType = useWatch({ control: attributeForm.control, name: 'attribute_type' });
  const watchedOptions = useWatch({ control: attributeForm.control, name: 'options' }) || [];

  // Fetch machine types from dedicated table
  const { data: machineTypes } = useQuery({
    queryKey: ['machine-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_types')
        .select('*')
        .order('sequence_order', { nullsFirst: false })
        .order('name');
      if (error) throw error;
      return data;
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

  // Sync template changes to all machines of the same type
  const syncTemplateToMachines = async (templateId: string, template: TemplateForm) => {
    // Find all machine_sections that use this template
    const { data: sections, error: sectionsError } = await supabase
      .from('machine_sections')
      .select('id')
      .eq('template_id', templateId);
    if (sectionsError) throw sectionsError;

    // Update all sections with the new template values
    if (sections && sections.length > 0) {
      const { error: updateError } = await supabase
        .from('machine_sections')
        .update({
          name: template.section_name,
          description: template.description,
          sequence_order: template.sequence_order,
        })
        .eq('template_id', templateId);
      if (updateError) throw updateError;
    }
  };

  // Add new template section to existing machines
  const addTemplateSectionToExistingMachines = async (template: TemplateForm, templateId: string) => {
    // Find all machines with this machine_type that don't have this section yet
    const { data: machines, error: machinesError } = await supabase
      .from('machines')
      .select('id')
      .eq('machine_type', template.machine_type);
    if (machinesError) throw machinesError;

    if (machines && machines.length > 0) {
      // For each machine, check if it has this template section
      for (const machine of machines) {
        const { data: existing } = await supabase
          .from('machine_sections')
          .select('id')
          .eq('machine_id', machine.id)
          .eq('template_id', templateId)
          .single();

        // Only add if doesn't exist
        if (!existing) {
          const { data: newSection, error: sectionError } = await supabase
            .from('machine_sections')
            .insert({
              machine_id: machine.id,
              template_id: templateId,
              name: template.section_name,
              description: template.description,
              sequence_order: template.sequence_order,
            })
            .select()
            .single();
          if (sectionError) throw sectionError;

          // Fetch attribute definitions
          const { data: attrDefs } = await supabase
            .from('section_attribute_definitions')
            .select('*')
            .eq('template_id', templateId);

          if (attrDefs && attrDefs.length > 0) {
            const attrValues = attrDefs.map((def) => ({
              section_id: newSection.id,
              attribute_definition_id: def.id,
              attribute_name: def.attribute_name,
              attribute_value: null,
            }));
            await supabase.from('section_attribute_values').insert(attrValues);
          }
        }
      }
    }
  };

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (values: TemplateForm) => {
      const { data, error } = await supabase.from('machine_section_templates').insert(values).select().single();
      if (error) throw error;
      // Add this new section to all existing machines of this type
      await addTemplateSectionToExistingMachines(values, data.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-templates'] });
      queryClient.invalidateQueries({ queryKey: ['machine-types'] });
      queryClient.invalidateQueries({ queryKey: ['machine-types-dropdown'] });
      toast({ title: 'Sección creada', description: 'Aplicada a equipos existentes del mismo tipo.' });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...values }: TemplateForm & { id: string }) => {
      const { error } = await supabase.from('machine_section_templates').update(values).eq('id', id);
      if (error) throw error;
      // Sync changes to all machines using this template
      await syncTemplateToMachines(id, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-templates'] });
      queryClient.invalidateQueries({ queryKey: ['machine-types'] });
      queryClient.invalidateQueries({ queryKey: ['machine-types-dropdown'] });
      toast({ title: 'Sección actualizada', description: 'Cambios sincronizados con equipos existentes.' });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      templateForm.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete associated sections first (will cascade to attribute values via FK)
      const { error: sectionsError } = await supabase
        .from('machine_sections')
        .delete()
        .eq('template_id', id);
      if (sectionsError) throw sectionsError;
      
      const { error } = await supabase.from('machine_section_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-templates'] });
      queryClient.invalidateQueries({ queryKey: ['machine-types'] });
      queryClient.invalidateQueries({ queryKey: ['machine-types-dropdown'] });
      toast({ title: 'Sección eliminada', description: 'Eliminada también de equipos existentes.' });
      if (selectedTemplateId) setSelectedTemplateId(null);
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Sync attribute changes to existing sections
  const syncAttributeToSections = async (attrDefId: string, attrName: string) => {
    // Update all attribute values that reference this definition
    const { error } = await supabase
      .from('section_attribute_values')
      .update({ attribute_name: attrName })
      .eq('attribute_definition_id', attrDefId);
    if (error) throw error;
  };

  // Add new attribute to existing sections
  const addAttributeToExistingSections = async (attrDefId: string, attrName: string, templateId: string) => {
    // Find all sections that use this template
    const { data: sections, error: sectionsError } = await supabase
      .from('machine_sections')
      .select('id')
      .eq('template_id', templateId);
    if (sectionsError) throw sectionsError;

    if (sections && sections.length > 0) {
      const attrValues = sections.map((section) => ({
        section_id: section.id,
        attribute_definition_id: attrDefId,
        attribute_name: attrName,
        attribute_value: null,
      }));
      const { error } = await supabase.from('section_attribute_values').insert(attrValues);
      if (error) throw error;
    }
  };

  // Attribute mutations
  const createAttributeMutation = useMutation({
    mutationFn: async (values: AttributeForm) => {
      const { options, ...rest } = values;
      const { data, error } = await supabase.from('section_attribute_definitions').insert({
        ...rest,
        options: values.attribute_type === 'select' ? options : null,
        template_id: selectedTemplateId,
      }).select().single();
      if (error) throw error;
      // Add this attribute to all existing sections using this template
      await addAttributeToExistingSections(data.id, values.attribute_name, selectedTemplateId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-attributes', selectedTemplateId] });
      toast({ title: 'Atributo creado', description: 'Agregado a secciones existentes.' });
      setIsAttributeDialogOpen(false);
      attributeForm.reset({ attribute_name: '', attribute_type: 'text', is_required: false, sequence_order: 0, options: [] });
      setNewOptionValue('');
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateAttributeMutation = useMutation({
    mutationFn: async ({ id, options, ...values }: AttributeForm & { id: string }) => {
      const { error } = await supabase.from('section_attribute_definitions').update({
        ...values,
        options: values.attribute_type === 'select' ? options : null,
      }).eq('id', id);
      if (error) throw error;
      // Sync name change to existing attribute values
      await syncAttributeToSections(id, values.attribute_name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-attributes', selectedTemplateId] });
      toast({ title: 'Atributo actualizado', description: 'Cambios sincronizados.' });
      setIsAttributeDialogOpen(false);
      setEditingAttribute(null);
      attributeForm.reset({ attribute_name: '', attribute_type: 'text', is_required: false, sequence_order: 0, options: [] });
      setNewOptionValue('');
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteAttributeMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete attribute values first
      const { error: valuesError } = await supabase
        .from('section_attribute_values')
        .delete()
        .eq('attribute_definition_id', id);
      if (valuesError) throw valuesError;
      
      const { error } = await supabase.from('section_attribute_definitions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-attributes', selectedTemplateId] });
      toast({ title: 'Atributo eliminado', description: 'Eliminado de todas las secciones.' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Create new machine type
  const createMachineTypeMutation = useMutation({
    mutationFn: async ({ name, sequences }: { name: string; sequences: string[] }) => {
      const { data: existing } = await supabase
        .from('machine_types')
        .select('id')
        .eq('name', name)
        .limit(1);
      if (existing && existing.length > 0) {
        throw new Error(`Ya existe un tipo de equipo con el nombre "${name}"`);
      }
      
      const { data, error } = await supabase
        .from('machine_types')
        .insert({ name, sequences })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['machine-types'] });
      setSelectedType(data.name);
      setIsMachineTypeDialogOpen(false);
      setNewMachineTypeName('');
      setNewMachineTypeSequences([]);
      toast({ title: 'Tipo creado', description: `Se creó el tipo "${data.name}".` });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Rename/Update machine type
  const renameMachineTypeMutation = useMutation({
    mutationFn: async ({ id, oldName, newName, sequences }: { id: string; oldName: string; newName: string; sequences: string[] }) => {
      // Check if new name already exists (if name changed)
      if (oldName !== newName) {
        const { data: existing } = await supabase
          .from('machine_types')
          .select('id')
          .eq('name', newName)
          .neq('id', id)
          .limit(1);
        if (existing && existing.length > 0) {
          throw new Error(`Ya existe un tipo de equipo con el nombre "${newName}"`);
        }
      }
      
      // Update the machine_types table
      const { error: typeError } = await supabase
        .from('machine_types')
        .update({ name: newName, sequences })
        .eq('id', id);
      if (typeError) throw typeError;
      
      // Update all templates with this machine_type (if name changed)
      if (oldName !== newName) {
        const { error } = await supabase
          .from('machine_section_templates')
          .update({ machine_type: newName })
          .eq('machine_type', oldName);
        if (error) throw error;
        
        // Update all machines with this machine_type
        const { error: machinesError } = await supabase
          .from('machines')
          .update({ machine_type: newName })
          .eq('machine_type', oldName);
        if (machinesError) throw machinesError;
      }
      
      return newName;
    },
    onSuccess: (newName) => {
      queryClient.invalidateQueries({ queryKey: ['machine-types'] });
      queryClient.invalidateQueries({ queryKey: ['section-templates'] });
      queryClient.invalidateQueries({ queryKey: ['machine-types-dropdown'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setSelectedType(newName);
      setIsMachineTypeDialogOpen(false);
      setMachineTypeToEdit(null);
      setMachineTypeToEditId(null);
      setNewMachineTypeName('');
      setNewMachineTypeSequences([]);
      toast({ title: 'Tipo actualizado' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Duplicate machine type (all sections + attributes)
  const duplicateMachineTypeMutation = useMutation({
    mutationFn: async ({ originalType, newTypeName }: { originalType: string; newTypeName: string }) => {
      // Check if new name already exists
      const { data: existing } = await supabase
        .from('machine_types')
        .select('id')
        .eq('name', newTypeName)
        .limit(1);
      if (existing && existing.length > 0) {
        throw new Error(`Ya existe un tipo de equipo con el nombre "${newTypeName}"`);
      }
      
      // Create the new machine type first
      const { error: typeError } = await supabase
        .from('machine_types')
        .insert({ name: newTypeName });
      if (typeError) throw typeError;
      
      // Get all templates for this type
      const { data: templatesData, error: templatesError } = await supabase
        .from('machine_section_templates')
        .select('*')
        .eq('machine_type', originalType);
      if (templatesError) throw templatesError;

      for (const template of templatesData || []) {
        // Create new template
        const { data: newTemplate, error: newTemplateError } = await supabase
          .from('machine_section_templates')
          .insert({
            machine_type: newTypeName,
            section_name: template.section_name,
            description: template.description,
            sequence_order: template.sequence_order,
          })
          .select()
          .single();
        if (newTemplateError) throw newTemplateError;

        // Get attributes for this template
        const { data: attrs, error: attrsError } = await supabase
          .from('section_attribute_definitions')
          .select('*')
          .eq('template_id', template.id);
        if (attrsError) throw attrsError;

        // Copy attributes to new template
        for (const attr of attrs || []) {
          await supabase.from('section_attribute_definitions').insert({
            template_id: newTemplate.id,
            attribute_name: attr.attribute_name,
            attribute_type: attr.attribute_type,
            is_required: attr.is_required,
            sequence_order: attr.sequence_order,
            options: attr.options,
          });
        }
      }
      return newTypeName;
    },
    onSuccess: (newTypeName) => {
      queryClient.invalidateQueries({ queryKey: ['machine-types'] });
      queryClient.invalidateQueries({ queryKey: ['section-templates'] });
      setSelectedType(newTypeName);
      setIsMachineTypeDialogOpen(false);
      setMachineTypeToEdit(null);
      setNewMachineTypeName('');
      toast({ title: 'Tipo duplicado', description: `Se creó "${newTypeName}" con todas sus secciones y atributos.` });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Duplicate section (with all attributes)
  const duplicateSectionMutation = useMutation({
    mutationFn: async (template: any) => {
      // Create new template
      const { data: newTemplate, error: newTemplateError } = await supabase
        .from('machine_section_templates')
        .insert({
          machine_type: template.machine_type,
          section_name: `${template.section_name} (Copia)`,
          description: template.description,
          sequence_order: (template.sequence_order || 0) + 1,
        })
        .select()
        .single();
      if (newTemplateError) throw newTemplateError;

      // Get attributes for this template
      const { data: attrs, error: attrsError } = await supabase
        .from('section_attribute_definitions')
        .select('*')
        .eq('template_id', template.id);
      if (attrsError) throw attrsError;

      // Copy attributes to new template
      for (const attr of attrs || []) {
        const { data: newAttr, error: newAttrError } = await supabase.from('section_attribute_definitions').insert({
          template_id: newTemplate.id,
          attribute_name: attr.attribute_name,
          attribute_type: attr.attribute_type,
          is_required: attr.is_required,
          sequence_order: attr.sequence_order,
          options: attr.options,
        }).select().single();
        if (newAttrError) throw newAttrError;
      }

      // Add this section to all existing machines of this type
      await addTemplateSectionToExistingMachines(
        { machine_type: template.machine_type, section_name: `${template.section_name} (Copia)`, description: template.description, sequence_order: (template.sequence_order || 0) + 1 },
        newTemplate.id
      );

      return newTemplate;
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['section-templates'] });
      setSelectedTemplateId(newTemplate.id);
      toast({ title: 'Sección duplicada', description: 'Se copió la sección con todos sus atributos.' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Duplicate attribute
  const duplicateAttributeMutation = useMutation({
    mutationFn: async (attr: any) => {
      const { data: newAttr, error } = await supabase.from('section_attribute_definitions').insert({
        template_id: selectedTemplateId,
        attribute_name: `${attr.attribute_name} (Copia)`,
        attribute_type: attr.attribute_type,
        is_required: attr.is_required,
        sequence_order: (attr.sequence_order || 0) + 1,
        options: attr.options,
      }).select().single();
      if (error) throw error;

      // Add this attribute to all existing sections using this template
      await addAttributeToExistingSections(newAttr.id, `${attr.attribute_name} (Copia)`, selectedTemplateId!);
      return newAttr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-attributes', selectedTemplateId] });
      toast({ title: 'Atributo duplicado', description: 'Se copió el atributo a la sección.' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Reorder machine types
  const reorderMachineTypesMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from('machine_types')
          .update({ sequence_order: i })
          .eq('id', orderedIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-types'] });
    },
    onError: (error) => toast({ title: 'Error al reordenar', description: error.message, variant: 'destructive' }),
  });

  // Reorder templates (sections)
  const reorderTemplatesMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from('machine_section_templates')
          .update({ sequence_order: i })
          .eq('id', orderedIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-templates'] });
    },
    onError: (error) => toast({ title: 'Error al reordenar', description: error.message, variant: 'destructive' }),
  });

  // Reorder attributes
  const reorderAttributesMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from('section_attribute_definitions')
          .update({ sequence_order: i })
          .eq('id', orderedIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-attributes', selectedTemplateId] });
    },
    onError: (error) => toast({ title: 'Error al reordenar', description: error.message, variant: 'destructive' }),
  });

  // DnD handlers
  const handleMachineTypeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !machineTypes) return;

    const oldIndex = machineTypes.findIndex((t) => t.id === active.id);
    const newIndex = machineTypes.findIndex((t) => t.id === over.id);
    const newOrder = arrayMove(machineTypes, oldIndex, newIndex);
    reorderMachineTypesMutation.mutate(newOrder.map((t) => t.id));
  };

  const handleTemplateDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !templates) return;

    const oldIndex = templates.findIndex((t) => t.id === active.id);
    const newIndex = templates.findIndex((t) => t.id === over.id);
    const newOrder = arrayMove(templates, oldIndex, newIndex);
    reorderTemplatesMutation.mutate(newOrder.map((t) => t.id));
  };

  const handleAttributeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !attributes) return;

    const oldIndex = attributes.findIndex((a) => a.id === active.id);
    const newIndex = attributes.findIndex((a) => a.id === over.id);
    const newOrder = arrayMove(attributes, oldIndex, newIndex);
    reorderAttributesMutation.mutate(newOrder.map((a) => a.id));
  };

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
    setNewOptionValue('');
    if (attribute) {
      setEditingAttribute(attribute);
      const existingOptions = Array.isArray(attribute.options) ? attribute.options : [];
      attributeForm.reset({
        attribute_name: attribute.attribute_name,
        attribute_type: attribute.attribute_type,
        is_required: attribute.is_required || false,
        sequence_order: attribute.sequence_order || 0,
        options: existingOptions,
      });
    } else {
      setEditingAttribute(null);
      const nextOrder = attributes ? Math.max(...attributes.map((a) => a.sequence_order || 0), 0) + 1 : 1;
      attributeForm.reset({
        attribute_name: '',
        attribute_type: 'text',
        is_required: false,
        sequence_order: nextOrder,
        options: [],
      });
    }
    setIsAttributeDialogOpen(true);
  };

  const addOption = () => {
    const trimmed = newOptionValue.trim();
    if (trimmed && !watchedOptions.includes(trimmed)) {
      attributeForm.setValue('options', [...watchedOptions, trimmed]);
      setNewOptionValue('');
    }
  };

  const removeOption = (optionToRemove: string) => {
    attributeForm.setValue('options', watchedOptions.filter((opt: string) => opt !== optionToRemove));
  };

  const onTemplateSubmit = (values: TemplateForm) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, ...values });
    } else {
      createTemplateMutation.mutate(values);
    }
  };

  const onAttributeSubmit = (values: AttributeForm) => {
    // Validate that select type has at least one option
    if (values.attribute_type === 'select' && (!values.options || values.options.length === 0)) {
      toast({
        title: 'Error de validación',
        description: 'Los atributos de tipo "Selección" requieren al menos una opción.',
        variant: 'destructive',
      });
      return;
    }
    
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Tipos de Equipo</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setMachineTypeToEdit(null);
                setNewMachineTypeName('');
                setMachineTypeDialogMode('create');
                setIsMachineTypeDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMachineTypeDragEnd}>
              <SortableContext items={machineTypes?.map((t) => t.id) || []} strategy={verticalListSortingStrategy}>
                {machineTypes?.map((type) => (
                  <SortableItem key={type.id} id={type.id}>
                    <div
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border transition-colors',
                        selectedType === type.name ? 'bg-primary/10 border-primary' : 'hover:bg-secondary'
                      )}
                    >
                      <button
                        onClick={() => {
                          setSelectedType(type.name);
                          setSelectedTemplateId(null);
                        }}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <Settings2 className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-medium">{type.name}</span>
                          {type.sequences && type.sequences.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {type.sequences.slice(0, 3).map((seq: string) => (
                                <Badge key={seq} variant="outline" className="text-xs px-1 py-0">
                                  {seq}
                                </Badge>
                              ))}
                              {type.sequences.length > 3 && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  +{type.sequences.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMachineTypeToEditId(type.id);
                            setMachineTypeToEdit(type.name);
                            setNewMachineTypeName(type.name);
                            setNewMachineTypeSequences(type.sequences || []);
                            setMachineTypeDialogMode('edit');
                            setIsMachineTypeDialogOpen(true);
                          }}
                          title="Editar tipo de equipo"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMachineTypeToEdit(type.name);
                            setNewMachineTypeName(`${type.name} (Copia)`);
                            setNewMachineTypeSequences([]);
                            setMachineTypeDialogMode('duplicate');
                            setIsMachineTypeDialogOpen(true);
                          }}
                          title="Duplicar tipo de equipo"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
            {(!machineTypes || machineTypes.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                No hay tipos definidos.
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTemplateDragEnd}>
                <SortableContext items={templates?.map((t) => t.id) || []} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {templates?.map((template) => (
                      <SortableItem key={template.id} id={template.id}>
                        <div
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
                                duplicateSectionMutation.mutate(template);
                              }}
                              disabled={duplicateSectionMutation.isPending}
                              title="Duplicar sección"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
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
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {templates?.length === 0 && !templatesLoading && selectedType && (
              <p className="text-center text-muted-foreground py-4">
                No hay secciones para este tipo
              </p>
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAttributeDragEnd}>
                <SortableContext items={attributes?.map((a) => a.id) || []} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {attributes?.map((attr) => {
                      const options = Array.isArray(attr.options) ? attr.options : [];
                      return (
                        <SortableItem key={attr.id} id={attr.id}>
                          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{attr.attribute_name}</p>
                                {attr.is_required && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                                    Requerido
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>
                                  {ATTRIBUTE_TYPES.find((t) => t.value === attr.attribute_type)?.label || attr.attribute_type}
                                </span>
                                {attr.attribute_type === 'select' && options.length > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                    {options.length} opciones
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => duplicateAttributeMutation.mutate(attr)}
                                disabled={duplicateAttributeMutation.isPending}
                                title="Duplicar atributo"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
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
                        </SortableItem>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {attributes?.length === 0 && !attributesLoading && selectedTemplateId && (
              <p className="text-center text-muted-foreground py-4">
                No hay atributos definidos
              </p>
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
              
              {/* Options field - only shown when type is 'select' */}
              {watchedAttributeType === 'select' && (
                <FormItem>
                  <FormLabel>Opciones de Selección</FormLabel>
                  <FormDescription>
                    Agrega las opciones que aparecerán en la lista desplegable
                  </FormDescription>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ej: Cabezal tipo A, Cabezal tipo B..."
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addOption();
                          }
                        }}
                      />
                      <Button type="button" variant="secondary" onClick={addOption}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {watchedOptions.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                        {watchedOptions.map((option: string, index: number) => (
                          <Badge key={index} variant="secondary" className="gap-1 pr-1">
                            {option}
                            <button
                              type="button"
                              onClick={() => removeOption(option)}
                              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    {watchedOptions.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No hay opciones agregadas. Escribe una opción y presiona Enter o el botón +
                      </p>
                    )}
                  </div>
                </FormItem>
              )}

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

      {/* Machine Type Create/Edit/Duplicate Dialog */}
      <Dialog open={isMachineTypeDialogOpen} onOpenChange={setIsMachineTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {machineTypeDialogMode === 'create'
                ? 'Nuevo Tipo de Equipo'
                : machineTypeDialogMode === 'edit'
                ? 'Editar Tipo de Equipo'
                : 'Duplicar Tipo de Equipo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {machineTypeDialogMode === 'create'
                  ? 'Nombre del nuevo tipo'
                  : machineTypeDialogMode === 'edit'
                  ? 'Nombre del tipo'
                  : 'Nombre para la copia'}
              </label>
              <Input
                value={newMachineTypeName}
                onChange={(e) => setNewMachineTypeName(e.target.value)}
                placeholder="Ej: SPI, AOI, Horno Reflow..."
              />
              {machineTypeDialogMode === 'duplicate' && (
                <p className="text-sm text-muted-foreground">
                  Se copiarán todas las secciones y atributos de "{machineTypeToEdit}"
                </p>
              )}
              {machineTypeDialogMode === 'create' && (
                <p className="text-sm text-muted-foreground">
                  El tipo se creará sin secciones. Podrás agregarlas después.
                </p>
              )}
            </div>
            
            {/* Sequences field - only for create and edit */}
            {machineTypeDialogMode !== 'duplicate' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Secuencias sugeridas</label>
                <SequenceChips
                  value={newMachineTypeSequences}
                  onChange={setNewMachineTypeSequences}
                  placeholder="Ej: 50, 50-1, 50-3..."
                />
                <p className="text-sm text-muted-foreground">
                  Las secuencias ayudan a identificar la posición del equipo en la línea SMT
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsMachineTypeDialogOpen(false);
                  setMachineTypeToEdit(null);
                  setMachineTypeToEditId(null);
                  setNewMachineTypeName('');
                  setNewMachineTypeSequences([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!newMachineTypeName.trim()) {
                    toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
                    return;
                  }
                  if (machineTypeDialogMode === 'create') {
                    createMachineTypeMutation.mutate({
                      name: newMachineTypeName.trim(),
                      sequences: newMachineTypeSequences,
                    });
                  } else if (machineTypeDialogMode === 'edit') {
                    renameMachineTypeMutation.mutate({
                      id: machineTypeToEditId!,
                      oldName: machineTypeToEdit!,
                      newName: newMachineTypeName.trim(),
                      sequences: newMachineTypeSequences,
                    });
                  } else {
                    duplicateMachineTypeMutation.mutate({
                      originalType: machineTypeToEdit!,
                      newTypeName: newMachineTypeName.trim(),
                    });
                  }
                }}
                disabled={
                  createMachineTypeMutation.isPending ||
                  renameMachineTypeMutation.isPending ||
                  duplicateMachineTypeMutation.isPending
                }
              >
                {(createMachineTypeMutation.isPending ||
                  renameMachineTypeMutation.isPending ||
                  duplicateMachineTypeMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {machineTypeDialogMode === 'create'
                  ? 'Crear'
                  : machineTypeDialogMode === 'edit'
                  ? 'Guardar'
                  : 'Duplicar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
