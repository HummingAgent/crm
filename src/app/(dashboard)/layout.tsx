'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Kanban,
  BarChart3,
  Mail,
  Calendar,
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  ChevronRight,
  Command,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { GlobalSearch } from '@/components/crm/global-search';
import { AIChatWidget } from '@/components/crm/ai-chat';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Deals', href: '/deals', icon: Kanban },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const secondaryNav = [
  { name: 'Emails', href: '/emails', icon: Mail },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 lg:px-5 lg:py-6 border-b border-[var(--border)]">
        <Link 
          href="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-semibold text-[15px] text-[var(--foreground)]">HummingAgent</h1>
            <p className="text-[11px] text-[var(--muted)] font-medium">CRM</p>
          </div>
        </Link>
        <button 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--card-hover)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main navigation */}
      <nav className="px-3 py-4 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'nav-item',
                  isActive && 'nav-item-active'
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span>{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t border-[var(--border)]">
          <p className="px-3 mb-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
            Tools
          </p>
          <div className="space-y-1">
            {secondaryNav.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'nav-item',
                    isActive && 'nav-item-active'
                  )}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--card-hover)] transition-colors">
          <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-semibold text-sm">
            SK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">Shawn Kercher</p>
            <p className="text-xs text-[var(--muted)] truncate">Admin</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-[var(--muted)] hover:text-[var(--danger)] rounded-lg hover:bg-[var(--danger-light)] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 bg-[var(--card)] border-r border-[var(--border)] transform transition-transform duration-200 ease-out lg:hidden flex flex-col safe-area-pl',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:fixed inset-y-0 left-0 z-50 w-64 bg-[var(--card)] border-r border-[var(--border)] flex-col">
        <NavContent />
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[var(--background)] border-b border-[var(--border)] safe-area-pt">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--card-hover)] transition-colors touch-feedback"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[var(--foreground)]">CRM</span>
            </div>

            {/* Search */}
            <div className="hidden lg:flex items-center gap-4 flex-1 max-w-md">
              <button 
                onClick={() => setShowSearch(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--muted)] bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--muted-foreground)] transition-colors text-left"
              >
                <Search className="w-4 h-4" />
                <span className="flex-1">Search deals, contacts...</span>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--card-hover)] rounded text-xs text-[var(--muted)]">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile search */}
              <button
                onClick={() => setShowSearch(true)}
                className="lg:hidden p-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--card-hover)] transition-colors touch-feedback"
              >
                <Search className="w-5 h-5" />
              </button>
              
              <button className="relative p-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--card-hover)] transition-colors touch-feedback">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--primary)] rounded-full" />
              </button>
              
              {/* Avatar on desktop */}
              <div className="hidden lg:flex items-center gap-2 ml-2 pl-2 border-l border-[var(--border)]">
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium text-sm">
                  SK
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Global Search Modal */}
        {showSearch && (
          <GlobalSearch onClose={() => setShowSearch(false)} />
        )}

        {/* Page content */}
        <main className="p-4 lg:p-6 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--card)] border-t border-[var(--border)] safe-area-pb">
          <div className="flex items-center justify-around px-2 py-2">
            {[
              { name: 'Home', href: '/', icon: LayoutDashboard },
              { name: 'Deals', href: '/deals', icon: Kanban },
              { name: 'Contacts', href: '/contacts', icon: Users },
              { name: 'Calendar', href: '/calendar', icon: Calendar },
              { name: 'More', href: '#', icon: Menu, action: () => setSidebarOpen(true) },
            ].map((item) => {
              const isActive = item.href === '#' ? false : 
                (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
              
              if (item.action) {
                return (
                  <button
                    key={item.name}
                    onClick={item.action}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] transition-colors touch-feedback"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.name}</span>
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors touch-feedback',
                    isActive 
                      ? 'text-[var(--primary)]' 
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Spacer for mobile bottom nav */}
        <div className="lg:hidden h-20 safe-area-pb" />

        {/* AI Chat Widget */}
        <AIChatWidget />
      </div>
    </div>
  );
}
