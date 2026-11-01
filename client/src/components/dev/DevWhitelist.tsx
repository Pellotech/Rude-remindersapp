import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Crown, Trash2, Eye, EyeOff, UserPlus, UserCheck } from 'lucide-react';
import { apiErrorText } from '@/lib/admin';

interface Entry { email: string; hasAccount: boolean }

const card = { background: '#1C1C1E', border: '1px solid #38383A' } as const;
const input = 'w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#8E8E93] outline-none focus:ring-2 focus:ring-[#C9A063]';

export function DevWhitelist() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const { data, isLoading } = useQuery<{ entries?: Entry[]; emails: string[] }>({
    queryKey: ['/api/admin/whitelist'],
    staleTime: 0,
  });
  const entries: Entry[] = data?.entries ?? (data?.emails ?? []).map((e) => ({ email: e, hasAccount: true }));

  const add = useMutation({
    mutationFn: () => apiRequest('/api/admin/whitelist', {
      method: 'POST',
      body: JSON.stringify({ email, password: password || undefined }),
    }),
    onSuccess: (res: any) => {
      toast({ title: res?.created ? 'Test login created 🌹' : 'Premium granted 👑', description: `${res?.email} now has Premium.` });
      setEmail(''); setPassword('');
      qc.invalidateQueries({ queryKey: ['/api/admin/whitelist'] });
    },
    onError: (e) => toast({ title: "Couldn't add", description: apiErrorText(e, 'Try again'), variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (e: string) => apiRequest('/api/admin/whitelist', { method: 'DELETE', body: JSON.stringify({ email: e }) }),
    onSuccess: (_r, e) => {
      toast({ title: 'Removed', description: `${e} no longer has whitelist Premium.` });
      qc.invalidateQueries({ queryKey: ['/api/admin/whitelist'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <div className="flex items-center gap-2 text-white font-semibold"><Crown className="h-4 w-4 text-[#C9A063]" /> Give someone Premium</div>
        <p className="text-xs text-[#AEAEB2] leading-relaxed">
          <b className="text-white">Already has an account?</b> Just enter their email — their password and name are never touched.<br />
          <b className="text-white">No account yet?</b> Add a password too and a test login is created (great for App Review or testers).
        </p>
        <input className={input} style={{ background: '#2C2C2E' }} placeholder="email@example.com" type="email"
          autoCapitalize="none" autoCorrect="off" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-whitelist-email" />
        <div className="relative">
          <input className={input} style={{ background: '#2C2C2E' }} placeholder="Password (only for new test logins)"
            type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-whitelist-password" />
          <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93]">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button onClick={() => add.mutate()} disabled={!email.includes('@') || add.isPending}
          className="w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
          style={{ background: '#C9A063', color: '#111827' }} data-testid="button-whitelist-add">
          {add.isPending ? 'Adding…' : 'Add to Whitelist'}
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={card}>
        <div className="px-4 py-3 text-[13px] uppercase tracking-wide text-[#8E8E93]" style={{ borderBottom: '1px solid #38383A' }}>
          Whitelisted ({entries.length})
        </div>
        {isLoading ? (
          <div className="px-4 py-6 text-sm text-[#8E8E93]">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[#8E8E93]">Nobody yet.</div>
        ) : entries.map((e) => (
          <div key={e.email} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2C2C2E' }}>
            <div className="flex items-center gap-2 min-w-0">
              {e.hasAccount ? <UserCheck className="h-4 w-4 text-[#22C55E] flex-shrink-0" /> : <UserPlus className="h-4 w-4 text-[#F59E0B] flex-shrink-0" />}
              <div className="min-w-0">
                <div className="text-sm text-white truncate">{e.email}</div>
                <div className="text-[11px] text-[#8E8E93]">{e.hasAccount ? 'Has an account' : 'Premium waiting — no account yet'}</div>
              </div>
            </div>
            <button onClick={() => remove.mutate(e.email)} disabled={remove.isPending}
              className="p-2 rounded-lg text-[#C53B3B] hover:bg-[#2C2C2E]" aria-label={`Remove ${e.email}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
