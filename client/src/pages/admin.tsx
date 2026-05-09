import { useEffect } from 'react';
import { Link, Route, Switch as WouterSwitch, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { AdminWhitelist } from '@/components/AdminWhitelist';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminFeatureFlags } from '@/components/admin/AdminFeatureFlags';
import { AdminEnvBadge } from '@/components/admin/AdminEnvBadge';
import { Shield, ChevronLeft, LogIn, Loader2, Crown, Users, ToggleLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const ADMIN_EMAIL = 'letmeknow6@icloud.com'.toLowerCase();

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { href: '/admin/whitelist', label: 'Whitelist', icon: <Crown className="h-4 w-4" /> },
  { href: '/admin/users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { href: '/admin/toggles', label: 'Toggles', icon: <ToggleLeft className="h-4 w-4" /> },
];

function AdminTabs() {
  const [location] = useLocation();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto rounded-xl p-1" style={{ background: '#1C1C1E', border: '1px solid #38383A' }}>
      {NAV.map((item) => {
        const active = location === item.href || (item.href === '/admin/whitelist' && location === '/admin');
        return (
          <Link key={item.href} href={item.href}>
            <button
              data-testid={`tab-${item.label.toLowerCase()}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                background: active ? '#C9A063' : 'transparent',
                color: active ? '#111827' : '#E5E5EA',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect /admin → /admin/whitelist
  useEffect(() => {
    if (location === '/admin') setLocation('/admin/whitelist');
  }, [location, setLocation]);

  const isAuthorized = user?.email?.toLowerCase() === ADMIN_EMAIL;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#C9A063' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#000000' }}>
        <div className="w-full max-w-md rounded-2xl p-6 text-center" style={{ background: '#1C1C1E', border: '1px solid #38383A' }}>
          <Shield className="h-10 w-10 mx-auto mb-3" style={{ color: '#C9A063' }} />
          <h1 className="text-xl font-bold text-white">Admin login required</h1>
          <p className="text-sm mt-2 mb-5" style={{ color: '#AEAEB2' }}>
            Sign in with the admin account to access the admin hub.
          </p>
          <Button
            onClick={() => setLocation('/login?redirect=/admin/whitelist')}
            className="w-full"
            style={{ background: '#C9A063', color: '#111827' }}
            data-testid="button-admin-login"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#000000' }}>
        <div className="w-full max-w-md rounded-2xl p-6 text-center" style={{ background: '#1C1C1E', border: '1px solid #38383A' }}>
          <Shield className="h-10 w-10 mx-auto mb-3" style={{ color: '#C53B3B' }} />
          <h1 className="text-xl font-bold text-white">Access denied</h1>
          <p className="text-sm mt-2" style={{ color: '#AEAEB2' }}>
            You don't have permission to view this page.
          </p>
          <p className="text-xs mt-1" style={{ color: '#8E8E93' }}>
            Logged in as {user.email}
          </p>
          <Button
            onClick={() => setLocation('/')}
            variant="outline"
            className="w-full mt-5 border-0"
            style={{ background: '#2C2C2E', color: '#FFFFFF' }}
          >
            Go home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation('/')}
              className="flex items-center gap-1 text-sm"
              style={{ color: '#8E8E93' }}
              data-testid="button-admin-back"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: '#C9A063' }} />
              <h1 className="text-xl font-bold text-white">Admin Hub</h1>
            </div>
          </div>
          <AdminEnvBadge />
        </div>

        {/* Tabs */}
        <AdminTabs />

        {/* Tab content — wouter Switch */}
        <div className="pt-1">
          <WouterSwitch>
            <Route path="/admin/users" component={AdminUsers} />
            <Route path="/admin/toggles" component={AdminFeatureFlags} />
            <Route path="/admin/whitelist">
              <div className="rounded-xl p-5" style={{ background: '#1C1C1E', border: '1px solid #38383A' }}>
                <AdminWhitelist />
              </div>
            </Route>
            <Route>
              {/* Fallback while /admin is redirecting */}
              <div className="rounded-xl p-5" style={{ background: '#1C1C1E', border: '1px solid #38383A' }}>
                <AdminWhitelist />
              </div>
            </Route>
          </WouterSwitch>
        </div>
      </div>
    </div>
  );
}
