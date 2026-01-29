import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NavLink } from '@/components/NavLink';
import { Users, Factory, Wrench, AlertTriangle, BookOpen } from 'lucide-react';

export default function AdminLayout() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
        <NavLink
          to="/admin/users"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          activeClassName="bg-primary text-primary-foreground hover:bg-primary"
        >
          <Users className="w-4 h-4" />
          <span>Usuarios</span>
        </NavLink>
        <NavLink
          to="/admin/areas"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          activeClassName="bg-primary text-primary-foreground hover:bg-primary"
        >
          <Factory className="w-4 h-4" />
          <span>Áreas</span>
        </NavLink>
        <NavLink
          to="/admin/lines"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          activeClassName="bg-primary text-primary-foreground hover:bg-primary"
        >
          <Wrench className="w-4 h-4" />
          <span>Líneas y Equipos</span>
        </NavLink>
        <NavLink
          to="/admin/faults"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          activeClassName="bg-primary text-primary-foreground hover:bg-primary"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Tipos de Falla</span>
        </NavLink>
        <NavLink
          to="/admin/glossary"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          activeClassName="bg-primary text-primary-foreground hover:bg-primary"
        >
          <BookOpen className="w-4 h-4" />
          <span>Diccionario</span>
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}
