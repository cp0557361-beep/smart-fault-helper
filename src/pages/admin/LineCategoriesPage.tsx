import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, GripVertical, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '@/components/ui/SortableItem';

interface CategoryForm {
  name: string;
  description: string;
}

// Droppable zone component
function DroppableZone({ id, children, isOver, label }: { id: string; children: React.ReactNode; isOver?: boolean; label: string }) {
  const { setNodeRef, isOver: dropping } = useDroppable({ id });
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[120px] rounded-lg border-2 border-dashed p-3 transition-colors',
        (isOver || dropping) ? 'border-primary bg-primary/5' : 'border-border'
      )}
    >
      {children}
    </div>
  );
}

export default function LineCategoriesPage() {
  const queryClient = useQueryClient();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({ name: '', description: '' });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['line-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('line_categories')
        .select('*')
        .order('sequence_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all machine types
  const { data: machineTypes } = useQuery({
    queryKey: ['machine-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_types')
        .select('*')
        .order('sequence_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch assignments for selected category
  const { data: assignments } = useQuery({
    queryKey: ['category-assignments', selectedCategoryId],
    enabled: !!selectedCategoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_type_line_categories')
        .select('*, machine_types(id, name)')
        .eq('line_category_id', selectedCategoryId!)
        .order('sequence_order');
      if (error) throw error;
      return data;
    },
  });

  const assignedTypeIds = new Set(assignments?.map(a => a.machine_type_id) || []);
  const unassignedTypes = machineTypes?.filter(t => !assignedTypeIds.has(t.id)) || [];
  const assignedTypes = assignments?.map(a => ({
    id: a.machine_type_id,
    name: (a.machine_types as any)?.name || 'Desconocido',
    assignmentId: a.id,
    sequence_order: a.sequence_order,
  })) || [];

  // Category CRUD
  const createCategoryMutation = useMutation({
    mutationFn: async (values: CategoryForm) => {
      const maxOrder = categories?.reduce((max, c) => Math.max(max, c.sequence_order || 0), -1) ?? -1;
      const { error } = await supabase.from('line_categories').insert({
        ...values,
        sequence_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-categories'] });
      toast({ title: 'Categoría creada' });
      setIsCategoryDialogOpen(false);
      setCategoryForm({ name: '', description: '' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...values }: CategoryForm & { id: string }) => {
      const { error } = await supabase.from('line_categories').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-categories'] });
      toast({ title: 'Categoría actualizada' });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('line_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-categories'] });
      if (selectedCategoryId) setSelectedCategoryId(null);
      toast({ title: 'Categoría eliminada' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Assign machine type to category
  const assignMutation = useMutation({
    mutationFn: async (machineTypeId: string) => {
      const maxOrder = assignedTypes.reduce((max, t) => Math.max(max, t.sequence_order || 0), -1);
      const { error } = await supabase.from('machine_type_line_categories').insert({
        machine_type_id: machineTypeId,
        line_category_id: selectedCategoryId!,
        sequence_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-assignments', selectedCategoryId] });
      toast({ title: 'Equipo asignado' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Unassign machine type from category
  const unassignMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from('machine_type_line_categories').delete().eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-assignments', selectedCategoryId] });
      toast({ title: 'Equipo removido' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  // Reorder assigned types via drag and drop
  const reorderAssignmentsMutation = useMutation({
    mutationFn: async (reordered: typeof assignedTypes) => {
      for (let i = 0; i < reordered.length; i++) {
        const { error } = await supabase
          .from('machine_type_line_categories')
          .update({ sequence_order: i })
          .eq('id', reordered[i].assignmentId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-assignments', selectedCategoryId] });
    },
    onError: (error) => toast({ title: 'Error al reordenar', description: error.message, variant: 'destructive' }),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = assignedTypes.findIndex(t => t.id === active.id);
    const newIndex = assignedTypes.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(assignedTypes, oldIndex, newIndex);
    reorderAssignmentsMutation.mutate(reordered);
  };

  const openCategoryDialog = (category?: any) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, description: category.description || '' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
    }
    setIsCategoryDialogOpen(true);
  };

  const onCategorySubmit = () => {
    if (!categoryForm.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
      return;
    }
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, ...categoryForm });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Categories Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Categorías de Línea</CardTitle>
          <Button size="sm" onClick={() => openCategoryDialog()}>
            <Plus className="w-4 h-4 mr-1" />
            Nueva
          </Button>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {categories?.map((cat) => (
                <div
                  key={cat.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedCategoryId === cat.id ? 'bg-primary/10 border-primary' : 'hover:bg-secondary'
                  )}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground">{cat.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openCategoryDialog(cat); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('¿Eliminar categoría?')) deleteCategoryMutation.mutate(cat.id);
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!categories || categories.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No hay categorías. Crea una como "Placement" o "Backend".
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Panel - takes 2 cols */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedCategoryId
              ? `Equipos en "${categories?.find(c => c.id === selectedCategoryId)?.name}"`
              : 'Selecciona una categoría'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedCategoryId ? (
            <p className="text-center text-muted-foreground py-12">
              Selecciona una categoría de la izquierda para gestionar qué tipos de equipo están disponibles.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Available (unassigned) types */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Tipos disponibles</h3>
                <div className="space-y-2 min-h-[120px] rounded-lg border-2 border-dashed border-border p-3">
                  {unassignedTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-secondary/50 transition-colors"
                    >
                      <span className="text-sm font-medium">{type.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => assignMutation.mutate(type.id)}
                        disabled={assignMutation.isPending}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {unassignedTypes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Todos los tipos están asignados a esta categoría.
                    </p>
                  )}
                </div>
              </div>

              {/* Assigned types (drag to reorder) */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Asignados a esta categoría
                  <span className="text-xs ml-2">(arrastra para reordenar)</span>
                </h3>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={assignedTypes.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[120px] rounded-lg border-2 border-dashed border-primary/30 p-3">
                      {assignedTypes.map((type, index) => (
                        <SortableItem key={type.id} id={type.id}>
                          <div className="flex items-center justify-between p-2 rounded-md border bg-card">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center p-0">
                                {index + 1}
                              </Badge>
                              <span className="text-sm font-medium">{type.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => unassignMutation.mutate(type.assignmentId)}
                              disabled={unassignMutation.isPending}
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </Button>
                          </div>
                        </SortableItem>
                      ))}
                      {assignedTypes.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Sin equipos asignados. Usa las flechas para agregar tipos.
                        </p>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                placeholder="Ej: Placement, Backend, Inspección"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                placeholder="Descripción opcional..."
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={onCategorySubmit}
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {editingCategory ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
