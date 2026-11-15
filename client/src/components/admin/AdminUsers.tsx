import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Crown, Search, Users as UsersIcon } from "lucide-react";

import { palette } from "@/lib/theme";
interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string | null;
  isPremium: boolean;
  premiumSource: 'whitelist' | 'subscription' | 'none';
  createdAt: string | null;
}

interface UsersResponse {
  users: AdminUser[];
  count: number;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function AdminUsers() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users'],
  });

  const filtered = useMemo(() => {
    const list = data?.users ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: palette.uiCard, borderColor: palette.uiSeparator }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5" style={{ color: palette.gold }} />
          <h2 className="text-lg font-semibold text-white">All Users</h2>
        </div>
        <span className="text-xs" style={{ color: palette.uiLabel2 }}>
          {isLoading ? 'Loading…' : `${filtered.length} of ${data?.count ?? 0}`}
        </span>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: palette.uiLabel2 }} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name, or ID"
          className="pl-9 border-0"
          style={{ background: palette.uiRaised, color: '#FFFFFF' }}
          data-testid="input-admin-user-search"
        />
      </div>

      <div className="overflow-x-auto rounded-lg" style={{ background: '#000000' }}>
        <table className="min-w-full text-sm" style={{ color: palette.uiLabel4 }}>
          <thead>
            <tr style={{ background: palette.uiCard, color: palette.uiLabel2 }} className="text-left text-xs uppercase tracking-wider">
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Premium</th>
              <th className="px-3 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-3 py-6 text-center" style={{ color: palette.uiLabel2 }}>Loading users…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center" style={{ color: palette.uiLabel2 }}>No users match.</td></tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className="border-t" style={{ borderColor: palette.uiCard }} data-testid={`row-user-${u.id}`}>
                <td className="px-3 py-2 font-mono text-xs">{u.email || '—'}</td>
                <td className="px-3 py-2">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</td>
                <td className="px-3 py-2 capitalize">{u.subscriptionPlan}</td>
                <td className="px-3 py-2">
                  {u.isPremium ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption-sm font-semibold"
                      style={{ background: '#3a2f0f', color: palette.gold, border: `1px solid ${palette.gold}` }}>
                      <Crown className="h-3 w-3" /> {u.premiumSource === 'whitelist' ? 'Whitelist' : 'Active'}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: palette.uiLabel2 }}>—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: palette.uiLabel2 }}>{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
