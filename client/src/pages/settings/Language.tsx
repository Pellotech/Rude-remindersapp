import { useState } from "react";
import { Check, ChevronLeft, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { getPlatformInfo } from "@/utils/platformDetection";
import { LANGUAGES, languageInfo, type LanguageCode } from "@shared/languages";
import { getManualLanguage, getPhoneLanguage, setLanguage } from "@/i18n";

function Row({ label, detail, selected, onClick, last, testId, lang }: {
  label: string; detail?: string; selected: boolean; onClick: () => void; last?: boolean; testId?: string; lang?: string;
}) {
  return (
    <div
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      className={`flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer hover:bg-ui-raised transition-colors ${last ? "" : "border-b border-ui-separator"}`}
      data-testid={testId}
    >
      <div className="min-w-0">
        <div className="text-white text-body-lg break-words" lang={lang}>{label}</div>
        {detail && <div className="text-note text-ui-label-2 mt-0.5 break-words">{detail}</div>}
      </div>
      {selected && <Check className="h-5 w-5 flex-shrink-0 text-reem-gold" />}
    </div>
  );
}

export default function LanguageSettings() {
  const { t } = useTranslation();
  const { isAndroid, isIOS } = getPlatformInfo();
  const [, setLocation] = useLocation();
  const [manual, setManual] = useState<LanguageCode | null>(getManualLanguage);
  const phone = getPhoneLanguage();

  const choose = (code: LanguageCode | null) => {
    setManual(code);
    void setLanguage(code); // switches straight away and saves to the account (see useLanguageSync)
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-ui-separator safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setLocation("/settings")} className="flex items-center text-ui-link" data-testid="button-back">
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
              <span className="text-body-lg">{t("common.settings")}</span>
            </button>
            <button onClick={() => setLocation("/")} className="text-ui-link" data-testid="button-home" aria-label={t("common.home")}>
              <Home className="h-5 w-5" />
            </button>
          </div>
          <h1 className="text-[30px] leading-tight font-bold text-white px-4">{t("language.title")}</h1>
          <p className="text-note text-ui-label-2 px-4 pb-2">{t("common.savesAutomatically")}</p>
        </div>

        <div className="py-6 px-4 space-y-8" style={{ paddingBottom: isAndroid ? 120 : isIOS ? 80 : 24 }}>
          <div>
            <div className="bg-ui-card rounded-xl overflow-hidden border border-reem-gold/40" role="radiogroup" aria-label={t("language.title")}>
              <Row
                label={t("language.automatic")}
                detail={t("language.automaticDetail", { language: languageInfo(phone).native })}
                selected={!manual}
                onClick={() => choose(null)}
                last
                testId="language-automatic"
              />
            </div>
          </div>

          <div>
            <h2 className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">{t("language.choose")}</h2>
            <div className="bg-ui-card rounded-xl overflow-hidden border border-reem-gold/40" role="radiogroup" aria-label={t("language.choose")}>
              {LANGUAGES.map((l, i) => (
                <Row
                  key={l.code}
                  label={l.native}
                  detail={l.native === l.english ? undefined : l.english}
                  lang={l.code}
                  selected={manual === l.code}
                  onClick={() => choose(l.code)}
                  last={i === LANGUAGES.length - 1}
                  testId={`language-${l.code}`}
                />
              ))}
            </div>
            <p className="text-note text-ui-label-2 px-4 mt-2 leading-snug">{t("language.footer")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
