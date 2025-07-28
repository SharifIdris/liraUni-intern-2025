import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Activity,
  Clock,
  MessageSquare,
  Users,
  FileText,
  Settings,
  CheckCircle,
  AlertCircle,
  Brain,
  Sparkles,
} from 'lucide-react';
import logoImage from '/lovable-uploads/6eead968-e67b-4251-8efb-3fd17c54669a.png';

interface NavigationItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  role?: 'intern' | 'staff' | 'admin' | 'all';
}

export function AppSidebar() {
  const { profile } = useAuth();
  const { open } = useSidebar();
  const collapsed = !open;
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('activity');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (profile?.role === 'staff') {
      fetchPendingCount();
    }
  }, [profile]);

  const fetchPendingCount = async () => {
    if (!profile || profile.role !== 'staff') return;
    
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('id')
        .eq('status', 'pending');
      
      if (!error && data) {
        setPendingCount(data.length);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const navigationItems: NavigationItem[] = [
    { title: 'Activity', url: '#activity', icon: Activity, role: 'all' },
    { 
      title: 'Pending Reviews', 
      url: '#pending', 
      icon: Clock, 
      badge: pendingCount > 0 ? pendingCount.toString() : undefined, 
      role: 'staff' 
    },
    { title: 'Channels', url: '#channels', icon: MessageSquare, role: 'all' },
    { title: 'AI Tools', url: '#ai-tools', icon: Sparkles, role: 'intern' },
    { title: 'Reports', url: '#reports', icon: FileText, role: 'intern' },
    { title: 'Profile Settings', url: '#profile', icon: Settings, role: 'all' },
    { title: 'Interns', url: '#interns', icon: Users, role: 'staff' },
  ];

  const getNavCls = (isActive: boolean) =>
    isActive 
      ? 'bg-primary text-primary-foreground font-medium' 
      : 'hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground';

  const isActive = (url: string) => {
    const hash = url.replace('#', '');
    return activeTab === hash;
  };

  const handleNavClick = (url: string) => {
    const hash = url.replace('#', '');
    setActiveTab(hash);
    // Emit custom event for dashboard to listen to
    window.dispatchEvent(new CustomEvent('sidebarNavigation', { detail: { tab: hash } }));
  };

  const filteredItems = navigationItems.filter(item => 
    item.role === 'all' || 
    item.role === profile?.role ||
    (item.role === 'staff' && (profile?.role === 'staff' || profile?.role === 'admin'))
  );

  return (
    <Sidebar
      className={`${collapsed ? 'w-16' : 'w-64'} border-r border-sidebar-border transition-all duration-300`}
    >
      <SidebarContent className="bg-sidebar">
        {/* Logo and Branding */}
        <div className={`p-4 border-b border-sidebar-border ${collapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <img 
              src={logoImage} 
              alt="LIRA University Logo" 
              className="h-10 w-10 object-contain rounded-full shadow-md"
            />
            {!collapsed && (
              <div className="flex-1">
                <h2 className="text-lg font-bold text-sidebar-foreground">LIRA University</h2>
                <p className="text-xs text-sidebar-foreground/70">Intern Management</p>
              </div>
            )}
          </div>
        </div>

        {/* User Profile Section */}
        <div className={`p-4 border-b border-sidebar-border ${collapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-10 w-10 ring-2 ring-primary/10">
              <AvatarImage 
                src={profile?.avatar_url} 
                alt={profile?.full_name || 'User'} 
              />
              <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={profile?.role === 'admin' ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={getNavCls(isActive(item.url))}
                  >
                    <button
                      onClick={() => handleNavClick(item.url)}
                      className="w-full flex items-center gap-3 text-left transition-all duration-200"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge 
                              variant="secondary" 
                              className="ml-auto h-5 text-xs bg-warning text-warning-foreground"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Stats */}
        {!collapsed && (
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-sidebar-foreground/70">
                <span>Today's Status</span>
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div className="text-xs text-sidebar-foreground/50">
                All systems operational
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}