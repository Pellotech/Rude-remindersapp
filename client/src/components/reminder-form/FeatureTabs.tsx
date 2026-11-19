// Create Reminder form: the Voice / Photo / Quotes buttons and their panels.
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import type { UseFormReturn } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Camera, Quote, Lock } from "lucide-react";
import { isFeatureDisabled } from "@/config/featureFlags";
import { palette } from "@/lib/theme";
import { MobileCamera } from "../MobileCamera";
import { motivationCategories, type ReminderFormData } from "./schema";
import type { useReminderAttachments } from "./useReminderAttachments";

import { tr } from "@/i18n";
export function FeatureTabs({
  form, voiceCharacters, setSelectedVoice, hasProAccess, isFreePlan, isMobileWithCamera,
  gateAttachments, gateQuotes, attachments, selectedCategory, onCategorySelect,
  onVoiceTap, onPhotoTap, onQuotesTap,
}: {
  form: UseFormReturn<ReminderFormData>;
  voiceCharacters: any[];
  setSelectedVoice: (id: string) => void;
  hasProAccess: boolean;
  isFreePlan: boolean;
  isMobileWithCamera: boolean;
  gateAttachments: (action: () => void) => void;
  gateQuotes: (action: () => void) => void;
  attachments: ReturnType<typeof useReminderAttachments>;
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  onVoiceTap?: () => void;
  onPhotoTap?: () => void;
  onQuotesTap?: () => void;
}) {
  const [, setLocation] = useLocation();
  const { selectedAttachments, setSelectedAttachments, fileInputRef, handleFileSelect, handlePhotoAttachment, removeAttachment } = attachments;

  // Which panel is open, and the short "Go Premium" bubble on locked tabs
  const [activeFeatureTab, setActiveFeatureTab] = useState<'voice' | 'photo' | 'quotes' | null>(null);
  const [lockedTooltip, setLockedTooltip] = useState<'photo' | 'quotes' | null>(null);
  const lockedTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showLockedTooltip = (which: 'photo' | 'quotes') => {
    if (lockedTooltipTimerRef.current) clearTimeout(lockedTooltipTimerRef.current);
    setLockedTooltip(which);
    lockedTooltipTimerRef.current = setTimeout(() => setLockedTooltip(null), 2000);
  };

  return (
    <>
      {/* Tab bar */}
      <div className="relative">
        {lockedTooltip && (
          <div style={{
            position: 'absolute',
            bottom: '105%',
            left: lockedTooltip === 'photo' ? '50%' : '83%',
            transform: 'translateX(-50%)',
            backgroundColor: palette.charcoal,
            color: 'white',
            fontSize: '12px',
            borderRadius: '8px',
            padding: '6px 12px',
            whiteSpace: 'nowrap',
            zIndex: 50,
            pointerEvents: 'none',
          }}>
            {tr("features.goPremium")}
          </div>
        )}
      <div className="flex rounded-xl overflow-hidden border border-reem-gold dark:border-reem-concrete-edge">
        <button
          type="button"
          onClick={() => {
              const opening = activeFeatureTab !== 'voice';
              setActiveFeatureTab(opening ? 'voice' : null);
              if (opening) onVoiceTap?.();
            }}
          className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-sm font-bold transition-all focus:outline-none ${
            activeFeatureTab === 'voice' ? 'bg-[#A07840] text-reem-charcoal dark:bg-reem-concrete-ocean dark:text-white' : 'bg-reem-gold text-reem-charcoal hover:bg-reem-gold-dark dark:bg-reem-concrete-edge dark:text-white dark:hover:bg-[#22509F]'
          }`}
        >
          <Volume2 className="h-5 w-5" />
          {tr("features.voice")}
          <span className={`h-1 w-5 rounded-full mt-0.5 transition-all duration-200 ${activeFeatureTab === 'voice' ? 'bg-reem-charcoal dark:bg-white' : 'bg-transparent'}`} />
        </button>

        {!isFeatureDisabled('MEDIA_ATTACHMENTS') && (
          <button
            type="button"
            onClick={() => {
              if (!hasProAccess) { showLockedTooltip('photo'); return; }
              if (activeFeatureTab === 'photo') { setActiveFeatureTab(null); }
              else { gateAttachments(() => { setActiveFeatureTab('photo'); onPhotoTap?.(); }); }
            }}
            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-sm font-bold border-l border-r border-reem-gold-dark dark:border-reem-concrete-widget transition-all relative focus:outline-none ${
              activeFeatureTab === 'photo' ? 'bg-[#A07840] text-reem-charcoal dark:bg-reem-concrete-ocean dark:text-white' : 'bg-reem-gold text-reem-charcoal hover:bg-reem-gold-dark dark:bg-reem-concrete-edge dark:text-white dark:hover:bg-[#22509F]'
            }`}
          >
            <Camera className="h-5 w-5" />
            {tr("features.photo")}{selectedAttachments.length > 0 ? ` (${selectedAttachments.length})` : ''}
            {!hasProAccess && <Lock className="h-2.5 w-2.5 absolute top-1 right-1 text-reem-charcoal/50 dark:text-white/60" />}
            <span className={`h-1 w-5 rounded-full mt-0.5 transition-all duration-200 ${activeFeatureTab === 'photo' ? 'bg-reem-charcoal dark:bg-white' : 'bg-transparent'}`} />
          </button>
        )}

        {!isFeatureDisabled('MOTIVATIONAL_QUOTES') && (
          <button
            type="button"
            onClick={() => {
              if (!hasProAccess) { showLockedTooltip('quotes'); return; }
              if (activeFeatureTab === 'quotes') { setActiveFeatureTab(null); }
              else { gateQuotes(() => { setActiveFeatureTab('quotes'); onQuotesTap?.(); }); }
            }}
            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-sm font-bold transition-all relative focus:outline-none ${
              activeFeatureTab === 'quotes' ? 'bg-[#A07840] text-reem-charcoal dark:bg-reem-concrete-ocean dark:text-white' : 'bg-reem-gold text-reem-charcoal hover:bg-reem-gold-dark dark:bg-reem-concrete-edge dark:text-white dark:hover:bg-[#22509F]'
            }`}
          >
            <Quote className="h-5 w-5" />
            {tr("features.quotes")}
            {!hasProAccess && <Lock className="h-2.5 w-2.5 absolute top-1 right-1 text-reem-charcoal/50 dark:text-white/60" />}
            <span className={`h-1 w-5 rounded-full mt-0.5 transition-all duration-200 ${activeFeatureTab === 'quotes' ? 'bg-reem-charcoal dark:bg-white' : 'bg-transparent'}`} />
          </button>
        )}
      </div>
      </div>{/* end relative tooltip wrapper */}

      {/* Content panel — only shown when a tab is active */}
      {activeFeatureTab && (
        <div className="mt-2 border border-reem-gold rounded-xl bg-white px-3 pt-3 pb-4 space-y-3">

          {/* Voice panel */}
          {activeFeatureTab === 'voice' && (
            <div className="space-y-3">
              <p className="text-note font-semibold text-reem-charcoal uppercase tracking-wide">{tr("features.voiceCharacter")}</p>
              <Select
                value={form.watch("voiceCharacter")}
                onValueChange={(value) => {
                  const character = voiceCharacters.find((v: any) => v.id === value);
                  if (character?.premium && !hasProAccess) {
                    setLocation('/subscribe');
                  } else {
                    form.setValue("voiceCharacter", value);
                    setSelectedVoice(value);
                  }
                }}
              >
                <SelectTrigger className="w-full text-body-sm h-10 bg-reem-cream-deep border-reem-gold rounded-lg text-reem-charcoal">
                  <SelectValue placeholder={tr("features.selectVoice")}>
                    {voiceCharacters.find((v: any) => v.id === form.watch("voiceCharacter"))?.name || tr("features.selectVoice")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {voiceCharacters.map((character: any) => {
                    const isLocked = character.premium && !hasProAccess;
                    const isSelected = form.watch("voiceCharacter") === character.id;
                    return (
                      <SelectItem key={character.id} value={character.id}>
                        <span className="flex items-center gap-2 text-body-sm text-reem-charcoal">
                          <span className="w-4 text-center text-xs">{isLocked ? '🔒' : isSelected ? '✓' : ''}</span>
                          <span>{character.name}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Photo panel */}
          {activeFeatureTab === 'photo' && (
            <div className="space-y-3">
              <p className="text-note font-semibold text-reem-charcoal uppercase tracking-wide">
                {tr("features.addPhotos", { count: selectedAttachments.length, max: isFreePlan ? 1 : 5 })}
              </p>
              {isMobileWithCamera ? (
                <MobileCamera
                  onPhotoCaptured={(photoUrl) => {
                    const maxAttachments = isFreePlan ? 1 : 5;
                    setSelectedAttachments(prev => [...prev, photoUrl].slice(0, maxAttachments));
                  }}
                  maxFiles={isFreePlan ? 1 : 5}
                  currentCount={selectedAttachments.length}
                  onGatedAction={(action) => { gateAttachments(action); }}
                />
              ) : (
                <>
                  <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                  <button
                    type="button"
                    onClick={handlePhotoAttachment}
                    disabled={isFreePlan && selectedAttachments.length >= 1}
                    className="w-full h-16 rounded-xl border-2 border-dashed border-reem-gold bg-reem-cream-deep flex items-center justify-center gap-2 text-xs text-reem-gold font-medium hover:bg-[#EDE0CF] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Camera className="h-4 w-4" />
                    {tr("features.tapToAddPhoto")}
                  </button>
                </>
              )}
              <div className="grid grid-cols-5 gap-1.5">
                {selectedAttachments.map((attachment, index) => (
                  <div key={index} className="relative aspect-square">
                    <img src={attachment} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button type="button" onClick={() => removeAttachment(index)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                  </div>
                ))}
                {Array.from({ length: (isFreePlan ? 1 : 5) - selectedAttachments.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square rounded-lg border border-dashed border-reem-gold/40 bg-reem-cream-deep/50" />
                ))}
              </div>
            </div>
          )}

          {/* Quotes panel */}
          {activeFeatureTab === 'quotes' && (
            <div className="space-y-3">
              <p className="text-note font-semibold text-reem-charcoal uppercase tracking-wide">{tr("features.motivationStyle")}</p>
              <Select value={selectedCategory} onValueChange={onCategorySelect}>
                <SelectTrigger className="w-full text-body-sm h-10 bg-reem-cream-deep border-reem-gold rounded-lg text-reem-charcoal">
                  <SelectValue placeholder={tr("features.chooseAMotivationStyle")} />
                </SelectTrigger>
                <SelectContent>
                  {motivationCategories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2 text-body-sm text-reem-charcoal">
                          <IconComponent className="h-4 w-4" />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-caption text-reem-charcoal">{tr("features.aMotivationalQuoteFromYour")}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
