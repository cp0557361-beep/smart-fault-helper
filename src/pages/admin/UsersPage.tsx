import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Shield, User, Eye } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  role_id: string;
  assigned_area_id: string | null;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          user_roles (
            id,
            role,
            assigned_area_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((user) => {
        const userRole = Array.isArray(user.user_roles) ? user.user_roles[0] : null;
        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: userRole?.role || 'operador',
          role_id: userRole?.id || '',
          assigned_area_id: userRole?.assigned_area_id || null,
        };
      }) as UserWithRole[];
    },
  });

  const { data: areas } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('areas').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, role, areaId }: { roleId: string; role: AppRole; areaId: string | null }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role, assigned_area_id: areaId })
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Rol actualizado', description: 'El rol del usuario ha sido actualizado.' });
      setEditingUser(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getRoleBadge = (role: AppRole) => {
    const variants: Record<AppRole, { icon: React.ReactNode; label: string; className: string }> = {
      admin: { icon: <Shield className="w-3 h-3" />, label: 'Admin', className: 'bg-status-fault/20 text-status-fault' },
      supervisor: { icon: <Eye className="w-3 h-3" />, label: 'Supervisor', className: 'bg-status-warning/20 text-status-warning' },
      operador: { icon: <User className="w-3 h-3" />, label: 'Operador', className: 'bg-status-ok/20 text-status-ok' },
    };
    const { icon, label, className } = variants[role];
    return (
      <Badge variant="outline" className={className}>
        {icon}
        <span className="ml-1">{label}</span>
      </Badge>
    );
  };

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
        <h2 className="text-lg font-semibold">Gestión de Usuarios</h2>
        <p className="text-sm text-muted-foreground">{users?.length || 0} usuarios registrados</p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Área Asignada</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name || 'Sin nombre'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {editingUser === user.id ? (
                    <Select
                      defaultValue={user.role}
                      onValueChange={(value) => {
                        updateRoleMutation.mutate({
                          roleId: user.role_id,
                          role: value as AppRole,
                          areaId: user.assigned_area_id,
                        });
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operador">Operador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getRoleBadge(user.role)
                  )}
                </TableCell>
                <TableCell>
                  {editingUser === user.id && user.role === 'supervisor' ? (
                    <Select
                      defaultValue={user.assigned_area_id || ''}
                      onValueChange={(value) => {
                        updateRoleMutation.mutate({
                          roleId: user.role_id,
                          role: user.role,
                          areaId: value || null,
                        });
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Seleccionar área" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas?.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">
                      {user.role === 'supervisor'
                        ? areas?.find((a) => a.id === user.assigned_area_id)?.name || 'Sin asignar'
                        : '-'}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={editingUser === user.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                  >
                    {editingUser === user.id ? 'Listo' : 'Editar'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
