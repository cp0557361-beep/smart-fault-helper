import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  ClipboardList, 
  Settings, 
  LogOut, 
  Menu,
  X,
  User,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles?: ('operador' | 'supervisor' | 'admin')[];
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Planta', path: '/dashboard' },
  { icon: ClipboardList, label: 'Mis Reportes', path: '/reports' },
  { icon: BarChart3, label: 'Estadísticas', path: '/stats', roles: ['supervisor', 'admin'] },
  { icon: Settings, label: 'Administrar', path: '/admin', roles: ['admin'] },
];

export function AppLayout() {
  const { user, signOut, isAdmin, isSupervisor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    if (item.roles.includes('admin') && isAdmin) return true;
    if (item.roles.includes('supervisor') && (isSupervisor || isAdmin)) return true;
    return false;
  });

  const getRoleLabel = () => {
    if (isAdmin) return 'Administrador';
    if (isSupervisor) return 'Supervisor';
    return 'Operador';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">SMT</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-foreground">SMT Ops Assistant</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{user?.email?.split('@')[0]}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                {getRoleLabel()}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex w-64 border-r border-border bg-sidebar flex-col">
          <nav className="flex-1 p-4 space-y-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                    "text-left touch-manipulation",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div 
              className="absolute left-0 top-16 w-64 h-[calc(100%-4rem)] bg-sidebar border-r border-border animate-slide-in-right"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="p-4 space-y-2">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                        "text-left touch-manipulation",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{user?.email}</p>
                    <p className="text-xs text-primary">{getRoleLabel()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur safe-area-inset">
        <div className="flex justify-around py-2">
          {filteredNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all touch-manipulation",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
