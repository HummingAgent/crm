'use client';

import { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const NavContent = () => (
    <>
      {/* Logo - clickable to home */}
      <div className="flex items-center justify-between px-4 py-4 lg:px-6 lg:py-5 border-b border-gray-100/50">
        <Link 
          href="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-all group-hover:scale-105">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-gray-900 group-hover:text-violet-600 transition-colors">HummingAgent</h1>
            <p className="text-xs text-gray-400 font-medium">CRM</p>
          </div>
        </Link>
        <button 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
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
                  'group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    isActive ? 'bg-violet-500/10' : 'group-hover:bg-gray-100'
                  )}>
                    <item.icon className={cn('w-4 h-4', isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-600')} />
                  </div>
                  {item.name}
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100/70">
          <p className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
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
                    'group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      isActive ? 'bg-violet-500/10' : 'group-hover:bg-gray-100'
                    )}>
                      <item.icon className={cn('w-4 h-4', isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-600')} />
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

      {/* User section at bottom */}
      <div className="p-4 border-t border-gray-100/50 bg-gradient-to-t from-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold shadow-md shadow-violet-500/20">
            SK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Shawn Kercher</p>
            <p className="text-xs text-gray-500 truncate">Admin</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2.5 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:hidden flex flex-col',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex-col">
        <NavContent />
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold">H</span>
              </div>
              <span className="font-semibold text-gray-900">CRM</span>
            </div>

            {/* Search - hidden on mobile */}
            <div className="hidden lg:flex items-center gap-4 flex-1">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search deals, contacts..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
            </button>
          </div>

          {/* Mobile search - separate row */}
          <div className="lg:hidden px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 safe-area-pb">
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
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-gray-400"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs">{item.name}</span>
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-lg',
                    isActive ? 'text-violet-600' : 'text-gray-400'
                  )}
                >
                  <item.icon className={cn('w-5 h-5', isActive && 'text-violet-600')} />
                  <span className="text-xs">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Spacer for bottom nav on mobile */}
        <div className="lg:hidden h-20" />
      </div>
    </div>
  );
}
