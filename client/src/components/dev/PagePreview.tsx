/**
 * PagePreview — renders the REAL app pages inside a phone-sized frame.
 *
 * Because these are the actual components (not screenshots), every change made
 * to the app shows up here automatically on the next build.
 *
 * "View as" fakes only the account type for the preview (Free / Premium /
 * Logged out) using a private data cache, so your real account is untouched.
 * Everything else (reminders, stats…) is your real data — buttons are live.
 */
import { Component, ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Switch, Route } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { queryClient as appQueryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

import Home from '@/pages/home';
import Settings from '@/pages/SettingsLanding';
import PersonalInfo from '@/pages/settings/PersonalInfo';
import SiriShortcuts from '@/pages/settings/SiriShortcuts';
import Notifications from '@/pages/settings/Notifications';
import Billing from '@/pages/settings/Billing';
import HelpPage from '@/pages/settings/Help';
import ReminderHistory from '@/pages/settings/ReminderHistory';
import Subscribe from '@/pages/subscribe';
import LoginPage from '@/pages/login';
import ForgotPassword from '@/pages/forgot-password';
import ResetPassword from '@/pages/reset-password';
import DeleteAccount from '@/pages/DeleteAccount';
import DeleteAccountComplete from '@/pages/DeleteAccountComplete';
import NotFound from '@/pages/not-found';
import SplashScreen from '@/components/SplashScreen';
import OfflineScreen from '@/components/OfflineScreen';
import { RichReminderNotification } from '@/components/RichReminderNotification';
import { CompletionCelebration } from '@/components/CompletionCelebration';
import { IntroTour } from '@/components/IntroTour';
import { SettingsIntro } from '@/components/SettingsIntro';
import { AnalyticsLocked } from '@/components/AnalyticsLocked';

export type ViewMode = 'free' | 'premium' | 'loggedOut';

export interface PageDef {
  id: string;
  group: string;
  label: string;
  /** Route pages: where the preview starts. You can tap around inside it. */
  path?: string;
  /** Pop-ups / pieces that aren't routes */
  render?: (close: () => void) => ReactNode;
  note?: string;
  /** Suggested account type for this page */
  bestAs?: ViewMode;
}

const SAMPLE_REMINDER: any = {
  id: 'dev-sample',
  title: 'Go to the gym',
  rudenessLevel: 4,
  rudeMessage: "Go to the gym. That couch has had enough of you, pumpkin head.",
  responses: [
    "Go to the gym. That couch has had enough of you, pumpkin head.",
    "Your gym bag has been packed so long it's filing for abandonment.",
  ],
  motivationalQuote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit. — Aristotle",
  attachments: [],
  voiceCharacter: 'default',
  scheduledFor: new Date().toISOString(),
  hitConfirmed: null,
  hitAt: null,
};

export const PAGES: PageDef[] = [
  // Main
  { id: 'home', group: 'Main app', label: 'Home (Create / Manage / Analytics)', path: '/', note: 'Use the tabs inside the preview to switch between Create, Manage and Analytics.' },
  { id: 'settings', group: 'Main app', label: 'Settings', path: '/settings' },
  { id: 'personal', group: 'Settings', label: 'Personal Information', path: '/settings/personal' },
  { id: 'notifications', group: 'Settings', label: 'Notifications', path: '/settings/notifications' },
  { id: 'siri', group: 'Settings', label: 'Siri & Shortcuts (iPhone only)', path: '/settings/siri' },
  { id: 'billing', group: 'Settings', label: 'Payment & Billing', path: '/settings/billing' },
  { id: 'history', group: 'Settings', label: 'Reminder History', path: '/settings/history' },
  { id: 'help', group: 'Settings', label: 'Help & Support', path: '/settings/help' },
  // Subscription
  { id: 'paywall', group: 'Subscription', label: 'Paywall (Subscribe screen)', path: '/subscribe', bestAs: 'free', note: 'Prices and the Continue button only load on a phone (App Store / Google Play).' },
  { id: 'premium-active', group: 'Subscription', label: 'Premium Active screen', path: '/subscribe', bestAs: 'premium' },
  { id: 'analytics-locked', group: 'Subscription', label: 'Analytics Locked (free)', bestAs: 'free', render: () => <div className="p-4"><AnalyticsLocked onUpgrade={() => {}} /></div> },
  // Pop-ups
  { id: 'reminder-popup', group: 'Pop-ups', label: 'Reminder pop-up (sample)', render: (close) => (
      <RichReminderNotification isOpen onClose={close} reminder={SAMPLE_REMINDER} isPremium showActionButtons onComplete={close} onMissed={close} />
    ) },
  { id: 'celebration', group: 'Pop-ups', label: 'Completion celebration', render: (close) => (
      <CompletionCelebration isOpen onClose={close} reminderTitle="Go to the gym" completionStreak={5} />
    ) },
  { id: 'intro-tour', group: 'Pop-ups', label: 'Intro tour', render: (close) => <IntroTour isOpen onClose={close} /> },
  { id: 'settings-intro', group: 'Pop-ups', label: 'Settings intro', render: (close) => <SettingsIntro isOpen onClose={close} /> },
  // Sign-in & account
  { id: 'login', group: 'Sign-in & account', label: 'Login / Sign up', path: '/login', bestAs: 'loggedOut' },
  { id: 'forgot', group: 'Sign-in & account', label: 'Forgot password', path: '/forgot-password', bestAs: 'loggedOut' },
  { id: 'reset', group: 'Sign-in & account', label: 'Reset password', path: '/reset-password', bestAs: 'loggedOut' },
  { id: 'delete', group: 'Sign-in & account', label: 'Delete account', path: '/delete-account', note: 'Viewing is safe — only the final confirm button deletes.' },
  { id: 'delete-done', group: 'Sign-in & account', label: 'Account deleted', path: '/delete-account/complete' },
  // System
  { id: 'splash', group: 'System screens', label: 'Splash / loading', render: () => <SplashScreen /> },
  { id: 'offline', group: 'System screens', label: 'Offline screen', render: () => <OfflineScreen onRetry={() => {}} /> },
  { id: 'not-found', group: 'System screens', label: 'Page not found', path: '/this-page-does-not-exist' },
];

// ── Fake account type, private to the preview ─────────────────────────────
const FOREVER = Date.now() + 1000 * 60 * 60 * 24 * 365 * 10;

function makePreviewClient(mode: ViewMode, realUser: any) {
  const client = new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() });
  const premium = mode === 'premium';
  const fakeUser = mode === 'loggedOut' ? null : {
    ...(realUser || {}),
    subscriptionPlan: premium ? 'premium' : 'free',
    subscriptionStatus: premium ? 'active' : 'free',
    isPremium: premium,
  };
  const fakeStatus = {
    isPremium: premium,
    source: 'dev-preview',
    features: { aiGeneratedResponses: premium, aiGeneratedQuotes: premium, monthlyReminderLimit: premium ? 120 : 15, advancedVoiceCharacters: premium },
  };
  const fakes: [string, unknown][] = [['/api/auth/user', fakeUser], ['/api/user/premium-status', fakeStatus]];
  const seed = () => fakes.forEach(([k, v]) => client.setQueryData([k], v, { updatedAt: FOREVER }));
  seed();
  // If anything inside the preview refetches the real account, put the fake back.
  client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    const hit = fakes.find(([k]) => event.query.queryKey[0] === k);
    if (hit && event.query.state.data !== hit[1]) client.setQueryData([hit[0]], hit[1], { updatedAt: FOREVER });
  });
  return client;
}

class PreviewBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 text-sm" style={{ color: '#C53B3B' }}>
          <b>This page crashed in preview.</b>
          <pre className="mt-2 whitespace-pre-wrap text-xs" style={{ color: '#6B3410' }}>{String(this.state.error.message)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function PreviewRoutes({ mode }: { mode: ViewMode }) {
  return (
    <Switch>
      <Route path="/">{mode === 'loggedOut' ? <LoginPage /> : <Home isPremium={mode === 'premium'} />}</Route>
      <Route path="/index.html">{mode === 'loggedOut' ? <LoginPage /> : <Home isPremium={mode === 'premium'} />}</Route>
      <Route path="/settings" component={Settings} />
      <Route path="/settings/personal" component={PersonalInfo} />
      <Route path="/settings/notifications" component={Notifications} />
      <Route path="/settings/siri" component={SiriShortcuts} />
      <Route path="/settings/billing" component={Billing} />
      <Route path="/settings/history" component={ReminderHistory} />
      <Route path="/settings/help" component={HelpPage} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/delete-account" component={DeleteAccount} />
      <Route path="/delete-account/complete" component={DeleteAccountComplete} />
      <Route component={NotFound} />
    </Switch>
  );
}

export function PagePreview({ page, mode, onClosePopup }: { page: PageDef; mode: ViewMode; onClosePopup: () => void }) {
  const { user } = useAuth();
  const client = useMemo(() => makePreviewClient(mode, user), [mode, (user as any)?.id]);
  const { hook } = useMemo(() => memoryLocation({ path: page.path || '/' }), [page.id, mode]);
  const [, force] = useState(0);
  useEffect(() => () => client.clear(), [client]);

  return (
    <div
      className="mx-auto overflow-y-auto overflow-x-hidden"
      style={{
        width: '100%',
        maxWidth: 390,
        height: 'min(780px, calc(100svh - 220px))',
        minHeight: 520,
        borderRadius: 32,
        border: '3px solid #C9A063',
        background: '#FFFFFF',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        // Makes "position: fixed" bits (floating Reem, help button) stay inside the phone frame
        transform: 'translateZ(0)',
      }}
    >
      <QueryClientProvider client={client}>
        <PreviewBoundary resetKey={`${page.id}-${mode}`}>
          {page.render ? (
            page.render(() => { onClosePopup(); force((n) => n + 1); })
          ) : (
            <Router hook={hook} key={`${page.id}-${mode}`}>
              <PreviewRoutes mode={mode} />
            </Router>
          )}
        </PreviewBoundary>
      </QueryClientProvider>
    </div>
  );
}
