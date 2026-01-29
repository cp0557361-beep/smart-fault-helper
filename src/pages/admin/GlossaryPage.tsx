import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Check, Trash2, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export default function GlossaryPage() {
  const queryClient = useQueryClient();
  const [mappingTerm, setMappingTerm] = useState<string | null>(null);

  const { data: glossary, isLoading } = useQuery({
    queryKey: ['admin-glossary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('glossary_learning')
        .select('*, fault_types(name)')
        .order('is_mapped', { ascending: true })
        .order('occurrences', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: faultTypes } = useQuery({
    queryKey: ['fault-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fault_types').select('id, name').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const mapTermMutation = useMutation({
    mutationFn: async ({ id, faultTypeId }: { id: string; faultTypeId: string }) => {
      const { error } = await supabase
        .from('glossary_learning')
        .update({
          suggested_fault_type_id: faultTypeId,
          is_mapped: true,
          mapped_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-glossary'] });
      toast({ title: 'Término mapeado', description: 'El sistema aprenderá de esta asociación.' });
      setMappingTerm(null);
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('glossary_learning').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-glossary'] });
      toast({ title: 'Término eliminado' });
    },
    onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const unmappedTerms = glossary?.filter((t) => !t.is_mapped) || [];
  const mappedTerms = glossary?.filter((t) => t.is_mapped) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Diccionario de Aprendizaje</h2>
        <p className="text-sm text-muted-foreground">
          Términos capturados por voz que el sistema no reconoció. Asígnalos a un tipo de falla para mejorar la clasificación.
        </p>
      </div>

      {/* Unmapped Terms */}
      {unmappedTerms.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-status-warning" />
            Términos sin mapear ({unmappedTerms.length})
          </h3>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Término</TableHead>
                  <TableHead>Ocurrencias</TableHead>
                  <TableHead>Asignar a</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unmappedTerms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-mono font-medium">{term.term}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{term.occurrences}x</Badge>
                    </TableCell>
                    <TableCell>
                      {mappingTerm === term.id ? (
                        <Select
                          onValueChange={(value) => mapTermMutation.mutate({ id: term.id, faultTypeId: value })}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Seleccionar tipo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {faultTypes?.map((ft) => (
                              <SelectItem key={ft.id} value={ft.id}>
                                {ft.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setMappingTerm(term.id)}>
                          Asignar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('¿Eliminar este término?')) {
                            deleteMutation.mutate(term.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Mapped Terms */}
      {mappedTerms.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-status-ok" />
            Términos mapeados ({mappedTerms.length})
          </h3>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Término</TableHead>
                  <TableHead>Mapeado a</TableHead>
                  <TableHead>Ocurrencias</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedTerms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-mono">{term.term}</TableCell>
                    <TableCell>
                      <Badge variant="default">{(term.fault_types as any)?.name || 'Desconocido'}</Badge>
                    </TableCell>
                    <TableCell>{term.occurrences}x</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('¿Eliminar este término?')) {
                            deleteMutation.mutate(term.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {glossary?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay términos en el diccionario.</p>
          <p className="text-sm">Los términos desconocidos capturados por voz aparecerán aquí.</p>
        </div>
      )}
    </div>
  );
}
