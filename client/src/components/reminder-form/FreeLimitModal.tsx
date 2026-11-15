// Create Reminder form: the "Free Limit Reached" pop-up.
import rudeRemindersLogo from '@assets/reems_logo_trimmed.png';

export function FreeLimitModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-[20px] p-6 mx-4 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="text-center space-y-4">
          <img src={rudeRemindersLogo} alt="Reems Rude Reminders" className="w-16 h-16 mx-auto object-contain" />
          <h2 className="text-xl font-bold text-reem-ink">Free Limit Reached</h2>
          <p className="text-reem-text-muted text-sm">You've used all your free reminders for this month. They reset on the 1st — or go Premium for 120 a month plus every feature.</p>
          <div className="space-y-2 pt-2">
            <button
              onClick={onUpgrade}
              className="w-full bg-reem-red hover:bg-reem-red-dark text-white font-semibold rounded-[14px] h-[48px] flex items-center justify-center gap-2 transition-colors"
            >
              Upgrade to Premium
            </button>
            <button
              onClick={onClose}
              className="w-full text-reem-text-muted h-[44px] text-sm"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
