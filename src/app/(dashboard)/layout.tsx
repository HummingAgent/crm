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
  Plus,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Command
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

  const currentTime = new Date().getHours();
  const getTimeGreeting = () => {
    if (currentTime < 12) return "Good morning";
    if (currentTime < 17) return "Good afternoon";
    return "Good evening";
  };

  const NavContent = () => (
    <>
      {/* Logo - clickable to home with premium glass effect */}
      <div className="flex items-center justify-between px-4 py-5 lg:px-6 lg:py-6 border-b border-gray-100/50">
        <Link 
          href="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 group spring-transition"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-lg group-hover:scale-105 lift-card">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg text-gray-900 group-hover:text-gradient-violet spring-transition">HummingAgent</h1>
            <p className="text-xs text-gray-500 font-medium">Premium CRM</p>
          </div>
        </Link>
        <button 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-2.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 spring-transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main navigation with enhanced styling */}
      <nav className="px-3 py-6 flex-1 overflow-y-auto">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'group flex items-center justify-between px-4 py-4 rounded-xl text-sm font-medium spring-transition hover:scale-[1.02]',
                  isActive
                    ? 'bg-gradient-to-r from-violet-500/15 via-purple-500/10 to-fuchsia-500/15 text-violet-700 shadow-violet border border-violet-500/10'
                    : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg spring-transition',
                    isActive ? 'bg-violet-500/10 shadow-sm' : 'group-hover:bg-white group-hover:shadow-sm'
                  )}>
                    <item.icon className={cn(
                      'w-4 h-4', 
                      isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-600'
                    )} />
                  </div>
                  <span className="font-medium">{item.name}</span>
                </div>
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-violet-500 shadow-sm shadow-violet-500/50 pulse-glow" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100/70">
          <p className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">
            Tools
          </p>
          <div className="space-y-2">
            {secondaryNav.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium spring-transition hover:scale-[1.02]',
                    isActive
                      ? 'bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-700 shadow-violet border border-violet-500/10'
                      : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-1.5 rounded-lg spring-transition',
                      isActive ? 'bg-violet-500/10' : 'group-hover:bg-white group-hover:shadow-sm'
                    )}>
                      <item.icon className={cn(
                        'w-4 h-4', 
                        isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-600'
                      )} />
                    </div>
                    {item.name}
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Enhanced user section */}
      <div className="p-4 border-t border-gray-100/50 glass-effect">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 spring-transition">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-violet-500/20">
            SK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">Shawn Kercher</p>
            <p className="text-xs text-violet-600 truncate font-medium">Admin</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2.5 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 spring-transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Gradient accent line */}
      <div className="fixed top-0 left-0 right-0 h-1 accent-line z-50" />
      
      {/* Mobile sidebar backdrop with enhanced blur */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar with glass effect */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-80 glass-effect border-r border-white/20 transform spring-transition lg:hidden flex flex-col slide-up-bottom safe-area-pl',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>

      {/* Desktop sidebar with glass effect */}
      <aside className="hidden lg:flex lg:fixed inset-y-0 left-0 z-50 w-72 glass-effect border-r border-white/20 flex-col">
        <NavContent />
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Enhanced mobile header with glass morphism */}
        <header className="sticky top-1 z-30 glass-effect border-b border-white/20 safe-area-pt">
          <div className="flex items-center justify-between px-4 py-4 lg:px-6 lg:py-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-3 -ml-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-white/50 spring-transition touch-feedback"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile logo with enhanced styling */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">CRM</span>
            </div>

            {/* Enhanced search with Command-K style */}
            <div className="hidden lg:flex items-center gap-4 flex-1">
              <button 
                onClick={() => setShowSearch(true)}
                className="relative max-w-md flex-1 flex items-center gap-3 pl-12 pr-16 py-3 text-sm text-gray-400 bg-white/50 border border-white/30 rounded-2xl hover:bg-white/60 spring-transition text-left"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                Search deals, contacts...
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
                  <Command className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">K</span>
                </div>
              </button>
            </div>

            {/* Enhanced notifications with avatar */}
            <div className="flex items-center gap-3">
              <button className="relative p-3 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/50 spring-transition touch-feedback">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-violet-500 rounded-full shadow-sm pulse-glow" />
              </button>
              
              {/* Avatar on desktop */}
              <div className="hidden lg:flex items-center gap-2 p-2 rounded-xl hover:bg-white/50 spring-transition cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-medium text-sm shadow-lg shadow-violet-500/25">
                  SK
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Shawn</p>
                  <p className="text-xs text-gray-500">{getTimeGreeting()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced mobile search */}
          <div className="lg:hidden px-4 pb-4">
            <button
              onClick={() => setShowSearch(true)}
              className="relative w-full flex items-center gap-3 pl-12 pr-4 py-3 text-sm text-gray-400 bg-white/50 border border-white/30 rounded-2xl backdrop-blur-sm text-left"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              Search anything...
            </button>
          </div>
        </header>

        {/* Global Search Modal */}
        {showSearch && (
          <GlobalSearch onClose={() => setShowSearch(false)} />
        )}

        {/* Page content with enhanced spacing */}
        <main className="p-4 lg:p-8 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Premium floating bottom navigation */}
        <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-40 safe-area-pb">
          <div className="glass-effect rounded-3xl px-2 py-3 shadow-2xl border border-white/30">
            <div className="flex items-center justify-around">
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
                      className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-400 hover:text-gray-600 spring-transition touch-feedback"
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{item.name}</span>
                    </button>
                  );
                }
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl spring-transition touch-feedback relative',
                      isActive 
                        ? 'text-violet-600 bg-violet-500/10' 
                        : 'text-gray-400 hover:text-gray-600'
                    )}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-2xl border border-violet-500/20" />
                    )}
                    <item.icon className={cn(
                      'w-5 h-5 relative z-10', 
                      isActive && 'text-violet-600'
                    )} />
                    <span className="text-xs font-medium relative z-10">{item.name}</span>
                    {isActive && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-violet-500 rounded-full shadow-sm pulse-glow" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Enhanced spacer for bottom nav */}
        <div className="lg:hidden h-24 safe-area-pb" />

        {/* AI Chat Widget */}
        <AIChatWidget />
      </div>
    </div>
  );
}
