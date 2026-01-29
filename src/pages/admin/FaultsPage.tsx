import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';

interface FaultTypeForm {
  name: string;
  description: string;
  category: string;
  keywords: string;
  is_active: boolean;
}

export default function FaultsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingFault, setEditingFault] = useState<any>(null);

  const form = useForm<FaultTypeForm>({
    defaultValues: { name: '', description: '', category: '', keywords: '', is_active: true },
  });

  const { data: faultTypes, isLoading } = useQuery({
    queryKey: ['admin-fault-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fault_types')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FaultTypeForm) => {
      const { error } = await supabase.from('fault_types').insert({
        ...values,
        keywords: values.keywords.split(',').map((k) => k.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fault-types'] });
      toast({ title: 'Tipo de falla creado' });
      setIsOpen(false);
      form.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: FaultTypeForm & { id: string }) => {
      const { error } = await supabase
        .from('fault_types')
        .update({
          ...values,
          keywords: values.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fault-types'] });
      toast({ title: 'Tipo de falla actualizado' });
      setIsOpen(false);
      setEditingFault(null);
      form.reset();
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fault_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fault-types'] });
      toast({ title: 'Tipo de falla eliminado' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('fault_types').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fault-types'] });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const onSubmit = (values: FaultTypeForm) => {
    if (editingFault) {
      updateMutation.mutate({ id: editingFault.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openEdit = (fault: any) => {
    setEditingFault(fault);
    form.reset({
      name: fault.name,
      description: fault.description || '',
      category: fault.category || '',
      keywords: fault.keywords?.join(', ') || '',
      is_active: fault.is_active,
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingFault(null);
    form.reset({ name: '', description: '', category: '', keywords: '', is_active: true });
    setIsOpen(true);
  };

  // Group by category
  const groupedFaults = faultTypes?.reduce((acc, fault) => {
    const cat = fault.category || 'Sin categoría';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(fault);
    return acc;
  }, {} as Record<string, typeof faultTypes>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tipos de Falla</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFault ? 'Editar Tipo de Falla' : 'Nuevo Tipo de Falla'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'El nombre es requerido' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Soldadura Fría" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Soldadura, Pick-up, Óptico..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descripción detallada del tipo de falla..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Palabras Clave</FormLabel>
                      <FormControl>
                        <Input placeholder="fría, no soldó, puente, corto..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Separadas por coma. El sistema IA usará estas palabras para clasificar reportes de voz.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Activo</FormLabel>
                        <FormDescription>Los tipos inactivos no aparecen en el catálogo.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {editingFault ? 'Guardar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {groupedFaults &&
        Object.entries(groupedFaults).map(([category, faults]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Palabras Clave</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faults?.map((fault) => (
                    <TableRow key={fault.id} className={!fault.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{fault.name}</p>
                          {fault.description && <p className="text-sm text-muted-foreground">{fault.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {fault.keywords?.slice(0, 3).map((kw, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {kw}
                            </Badge>
                          ))}
                          {(fault.keywords?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{fault.keywords!.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={fault.is_active}
                          onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: fault.id, is_active: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEdit(fault)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (confirm('¿Eliminar este tipo de falla?')) {
                                deleteMutation.mutate(fault.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
    </div>
  );
}
