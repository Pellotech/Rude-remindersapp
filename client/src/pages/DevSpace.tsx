/**
 * Developer Space — private area for the owner/staff.
 *   Lock 1: signed in with an admin email (checked on the server)
 *   Lock 2: the Developer Space passcode (DEV_SPACE_PASSCODE secret on the server)
 *
 * Tabs: Pages (flip through every real screen as Free / Premium / Logged out),
 *       Whitelist, Users, Toggles, Hits, Reminder Lab.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Shield, ChevronLeft, ChevronRight, LogIn, Loader2, Lock, LayoutGrid, Crown, Users, ToggleLeft, Target, FlaskConical, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { isAdminEmail, apiErrorText } from '@/lib/admin';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminFeatureFlags } from '@/components/admin/AdminFeatureFlags';
import { AdminHits } from '@/components/admin/AdminHits';
import { AdminEnvBadge } from '@/components/admin/AdminEnvBadge';
import { DevWhitelist } from '@/components/dev/DevWhitelist';
import { PagePreview, PAGES, ViewMode } from '@/components/dev/PagePreview';
import DevPreview from '@/pages/DevPreview';

import { palette } from "@/lib/theme";
// The server decides whether this device is unlocked; we only keep its key.
const SESSION_KEY = 'dev_space_session';
const GOLD = palette.gold;
const card = { background: palette.uiCard, border: `1px solid ${palette.uiSeparator}` } as const;

type Tab = 'pages' | 'whitelist' | 'users' | 'toggles' | 'hits' | 'lab';
const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'pages', label: 'Pages', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'whitelist', label: 'Whitelist', icon: <Crown className="h-4 w-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { id: 'toggles', label: 'Toggles', icon: <ToggleLeft className="h-4 w-4" /> },
  { id: 'hits', label: 'Hits', icon: <Target className="h-4 w-4" /> },
  { id: 'lab', label: 'Reminder Lab', icon: <FlaskConical className="h-4 w-4" /> },
];

const hasKey = () => { try { return !!localStorage.getItem(SESSION_KEY); } catch { return false; } };
const clearKey = () => { try { localStorage.removeItem(SESSION_KEY); } catch {} };

function BackToSettings() {
  const [, setLocation] = useLocation();
  return (
    <button onClick={() => setLocation('/settings')} className="flex items-center text-ui-link" data-testid="button-dev-back">
      <ChevronLeft className="h-5 w-5" />
      <span className="text-body-lg">Settings</span>
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col safe-area-header" style={{ background: '#000' }}>
      <div className="px-4 py-3"><BackToSettings /></div>
      <div className="flex-1 flex items-center justify-center px-4 pb-24">
        <div className="w-full max-w-sm rounded-2xl p-6 text-center" style={card}>{children}</div>
      </div>
    </div>
  );
}

function PasscodeGate({ onUnlock, message }: { onUnlock: () => void; message?: string }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res: any = await apiRequest('/api/admin/dev-space/unlock', { method: 'POST', body: JSON.stringify({ passcode: code }) });
      try { localStorage.setItem(SESSION_KEY, res.token); } catch {}
      onUnlock();
    } catch (err) {
      setError(apiErrorText(err, 'Wrong passcode'));
      setCode('');
    } finally { setBusy(false); }
  };
  return (
    <Shell>
      <Lock className="h-10 w-10 mx-auto mb-3" style={{ color: GOLD }} />
      <h1 className="text-xl font-bold text-white">Developer Space</h1>
      <p className="text-sm mt-1 mb-5" style={{ color: palette.uiLabel3 }}>{message || 'Enter the passcode'}</p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password" inputMode="text" autoFocus autoComplete="off" value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-lg px-3 py-3 text-center text-lg tracking-[0.3em] text-white outline-none focus:ring-2 focus:ring-reem-gold"
          style={{ background: palette.uiRaised }} data-testid="input-dev-passcode"
        />
        {error && <p className="text-sm" style={{ color: palette.coral }}>{error}</p>}
        <button type="submit" disabled={!code || busy} className="w-full rounded-lg py-3 font-semibold disabled:opacity-40"
          style={{ background: GOLD, color: palette.ink }} data-testid="button-dev-unlock">
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </Shell>
  );
}

function PagesTab() {
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<ViewMode>('free');
  const [popupClosed, setPopupClosed] = useState(false);
  const page = PAGES[idx];
  const groups = useMemo(() => Array.from(new Set(PAGES.map((p) => p.group))), []);

  const go = (i: number) => {
    const n = (i + PAGES.length) % PAGES.length;
    setIdx(n);
    setPopupClosed(false);
    if (PAGES[n].bestAs) setMode(PAGES[n].bestAs!);
  };

  return (
    <div className="space-y-3">
      {/* View as */}
      <div className="flex rounded-xl p-1 gap-1" style={card}>
        {([['free', 'Free'], ['premium', 'Premium 👑'], ['loggedOut', 'Logged out']] as [ViewMode, string][]).map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setPopupClosed(false); }}
            className="flex-1 rounded-lg py-2 text-sm font-semibold transition-colors"
            style={{ background: mode === m ? GOLD : 'transparent', color: mode === m ? palette.ink : palette.uiLabel4 }}
            data-testid={`view-as-${m}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Page picker + flip arrows */}
      <div className="flex items-center gap-2">
        <button onClick={() => go(idx - 1)} className="rounded-lg p-2.5" style={card} aria-label="Previous page"><ChevronLeft className="h-5 w-5 text-white" /></button>
        <select value={page.id} onChange={(e) => go(PAGES.findIndex((p) => p.id === e.target.value))}
          className="flex-1 min-w-0 rounded-lg px-3 py-2.5 text-sm text-white outline-none" style={{ ...card, background: palette.uiCard }}
          data-testid="select-dev-page">
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {PAGES.filter((p) => p.group === g).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </optgroup>
          ))}
        </select>
        <button onClick={() => go(idx + 1)} className="rounded-lg p-2.5" style={card} aria-label="Next page"><ChevronRight className="h-5 w-5 text-white" /></button>
      </div>
      <div className="flex items-center justify-between text-xs px-1" style={{ color: palette.uiLabel2 }}>
        <span>{idx + 1} / {PAGES.length} · {page.group}</span>
        <span>Live — buttons do real things</span>
      </div>
      {page.note && <p className="text-xs px-1" style={{ color: palette.uiLabel3 }}>💡 {page.note}</p>}

      {page.render && popupClosed ? (
        <div className="mx-auto flex flex-col items-center justify-center gap-3 rounded-[32px]" style={{ maxWidth: 390, height: 300, border: `3px dashed ${GOLD}` }}>
          <p className="text-sm" style={{ color: palette.uiLabel3 }}>Pop-up closed</p>
          <button onClick={() => setPopupClosed(false)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: GOLD, color: palette.ink }}>
            <RotateCcw className="h-4 w-4" /> Show it again
          </button>
        </div>
      ) : (
        <PagePreview page={page} mode={mode} onClosePopup={() => setPopupClosed(true)} />
      )}
    </div>
  );
}

export default function DevSpace() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  // 'checking' → asking the server; true/false → its answer
  const [unlocked, setUnlocked] = useState<boolean | 'checking'>(hasKey() ? 'checking' : false);
  const [lockMsg, setLockMsg] = useState<string | undefined>();
  const isAdmin = !!user && isAdminEmail((user as any).email);

  // Ask the server on open, every minute, and when the app comes back to the front.
  // If it was locked elsewhere, timed out, or the key is gone → back to the passcode screen.
  useEffect(() => {
    if (!isAdmin || unlocked === false) return;
    let stop = false;
    const check = async () => {
      try {
        const r: any = await apiRequest('/api/admin/dev-space/status', { method: 'GET' });
        if (stop) return;
        if (r?.unlocked) setUnlocked(true);
        else { clearKey(); setLockMsg('Locked — enter the passcode again'); setUnlocked(false); }
      } catch { if (!stop && unlocked === 'checking') setUnlocked(false); }
    };
    check();
    const t = window.setInterval(check, 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop = true; window.clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [isAdmin, unlocked]);
  const [tab, setTab] = useState<Tab>('pages');

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} /></div>;
  }

  if (!user) {
    return (
      <Shell>
        <Shield className="h-10 w-10 mx-auto mb-3" style={{ color: GOLD }} />
        <h1 className="text-xl font-bold text-white">Sign in first</h1>
        <p className="text-sm mt-2 mb-5" style={{ color: palette.uiLabel3 }}>Use the admin account to open the Developer Space.</p>
        <button onClick={() => setLocation('/login?redirect=/dev')} className="w-full rounded-lg py-3 font-semibold flex items-center justify-center gap-2" style={{ background: GOLD, color: palette.ink }}>
          <LogIn className="h-4 w-4" /> Go to login
        </button>
      </Shell>
    );
  }

  if (!isAdminEmail((user as any).email)) {
    return (
      <Shell>
        <Shield className="h-10 w-10 mx-auto mb-3" style={{ color: palette.red }} />
        <h1 className="text-xl font-bold text-white">No access</h1>
        <p className="text-xs mt-2" style={{ color: palette.uiLabel2 }}>Signed in as {(user as any).email}</p>
        <button onClick={() => setLocation('/')} className="w-full mt-5 rounded-lg py-3 text-white" style={{ background: palette.uiRaised }}>Go home</button>
      </Shell>
    );
  }

  if (unlocked === 'checking') {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} /></div>;
  }
  if (!unlocked) return <PasscodeGate message={lockMsg} onUnlock={() => { setLockMsg(undefined); setUnlocked(true); }} />;

  // Lock = closed on EVERY device, not just this one
  const lock = async () => {
    try { await apiRequest('/api/admin/dev-space/lock', { method: 'POST' }); } catch {}
    clearKey();
    setLockMsg('Locked on all your devices');
    setUnlocked(false);
  };

  return (
    <div className="min-h-screen" style={{ background: '#000' }}>
      <div className="max-w-5xl mx-auto px-4 pb-24 space-y-4 safe-area-header">
        <div className="flex items-center justify-between gap-3 pt-4">
          <BackToSettings />
          <div className="flex items-center gap-2">
            <AdminEnvBadge />
            <button onClick={lock} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs" style={{ ...card, color: palette.uiLabel4 }} data-testid="button-dev-lock">
              <Lock className="h-3.5 w-3.5" /> Lock
            </button>
          </div>
        </div>
        <p className="text-caption px-1" style={{ color: palette.uiLabel2 }}>
          Locks after 1 hour without use (12 hours max). Unlocking here signs out any other device. Lock closes it everywhere.
        </p>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" style={{ color: GOLD }} />
          <h1 className="text-2xl font-bold text-white">Developer Space</h1>
        </div>

        <nav className="flex gap-1 overflow-x-auto rounded-xl p-1" style={card}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              style={{ background: tab === t.id ? GOLD : 'transparent', color: tab === t.id ? palette.ink : palette.uiLabel4 }}
              data-testid={`dev-tab-${t.id}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'pages' && <PagesTab />}
          {tab === 'whitelist' && <DevWhitelist />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'toggles' && <AdminFeatureFlags />}
          {tab === 'hits' && <AdminHits />}
          {tab === 'lab' && <div className="rounded-xl overflow-hidden bg-white"><DevPreview /></div>}
        </div>
      </div>
    </div>
  );
}
