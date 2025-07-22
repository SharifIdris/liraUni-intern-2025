import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { DashboardHeader } from './DashboardHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onTabChange?: (tab: string) => void;
  onSearch?: (query: string) => void;
  onProfileClick?: () => void;
}

export function DashboardLayout({ 
  children, 
  onTabChange, 
  onSearch, 
  onProfileClick 
}: DashboardLayoutProps) {
  const [defaultOpen, setDefaultOpen] = useState(true);

  useEffect(() => {
    const handleSidebarNavigation = (event: CustomEvent) => {
      onTabChange?.(event.detail.tab);
    };

    window.addEventListener('sidebarNavigation', handleSidebarNavigation as EventListener);
    
    return () => {
      window.removeEventListener('sidebarNavigation', handleSidebarNavigation as EventListener);
    };
  }, [onTabChange]);

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="min-h-screen">
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader onSearch={onSearch} onProfileClick={onProfileClick} />
          <main className="flex-1 p-6 space-y-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}