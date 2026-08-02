import { useState } from "react";

const STORAGE_KEY = 'create_form_tooltip_seen';
const FIRST_SEEN_KEY = 'create_form_tooltip_first_seen_at';
const EXPIRY_MS = 3 * 24 * 60 * 60 * 1000; // stops showing 3 days after first seen

/**
 * useCreateTooltip — owns the "should the first-timer tip show?" logic.
 * Shows until dismissed, or until 3 days after it was first seen.
 */
export function useCreateTooltip() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem(STORAGE_KEY)) return false;
    let firstSeen = localStorage.getItem(FIRST_SEEN_KEY);
    if (!firstSeen) {
      firstSeen = String(Date.now());
      localStorage.setItem(FIRST_SEEN_KEY, firstSeen);
    }
    if (Date.now() - parseInt(firstSeen, 10) > EXPIRY_MS) {
      localStorage.setItem(STORAGE_KEY, 'true');
      return false;
    }
    return true;
  });

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  return { visible, dismiss };
}

/**
 * CreateTooltip — one-time "First reminder?" tip shown above the tabs.
 * Identical on free and premium.
 */
export function CreateTooltip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{
      background: 'white',
      border: '2px solid #C9A063',
      borderRadius: '12px',
      padding: '10px 12px',
      fontSize: '11px',
      color: '#333',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      position: 'relative',
    }} data-testid="card-create-tooltip">
      <img
        src="/rudy/Rudy_leaning_2_transparent.png"
        alt="Rudy"
        style={{ width: 36, height: 36, mixBlendMode: 'multiply', flexShrink: 0 }}
      />
      <span style={{ flex: 1, paddingRight: 16 }}>
        <strong>First reminder?</strong> Type what you want to be reminded about below, open the book to pick a date, hour and minute, slide the rudeness from Gentle to Savage, then add a photo, voice or quote if you want. Hit <strong>Create Reminder</strong> when you're ready.
      </span>
      <button
        onClick={onDismiss}
        style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#999', lineHeight: 1 }}
        data-testid="button-dismiss-create-tooltip"
        aria-label="Dismiss tip"
      >✕</button>
    </div>
  );
}

export default CreateTooltip;
