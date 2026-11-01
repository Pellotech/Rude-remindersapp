/**
 * Help & Support — full help centre, reached from Settings (last section).
 * Replaces the old floating "Help" button on the home screen.
 * Content lives in lib/helpContent.ts — edit that file to update articles.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ChevronDown, Home, Search, Compass, Mail, Bug, X, ExternalLink } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { helpCategories, searchHelp, type HelpArticle, type HelpCategory } from "@/lib/helpContent";
import { IntroTour } from "@/components/IntroTour";
import { getPlatformInfo } from "@/utils/platformDetection";

const SUPPORT_EMAIL = "ruderemindersinfo@gmail.com";
const PRIVACY_URL = "https://app.termly.io/policy-viewer/policy.html?policyUUID=378d9c6b-c46e-44ed-83a2-d8770229969c";
const TERMS_URL = "https://app.termly.io/policy-viewer/policy.html?policyUUID=34f340a5-79a7-4f66-b4f9-81f1e9693176";

const Icon = ({ name, className }: { name: string; className?: string }) => {
  const C = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <C className={className} />;
};

const openLink = async (url: string) => {
  if (url.startsWith("mailto:")) { window.location.href = url; return; }
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, presentationStyle: "popover" as any });
  } else {
    window.open(url, "_blank");
  }
};

function Row({ icon, title, subtitle, onClick, accent, external, testId }: {
  icon: React.ReactNode; title: string; subtitle?: string; onClick: () => void; accent?: boolean; external?: boolean; testId?: string;
}) {
  return (
    <button onClick={onClick} data-testid={testId}
      className="w-full flex items-center justify-between px-4 py-3.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] transition-colors text-left">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ? "bg-[#C53B3B]/20 text-[#FF6B6B]" : "bg-[#C9A063]/15 text-[#C9A063]"}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-white text-[15px] truncate">{title}</p>
          {subtitle && <p className="text-[12px] text-[#8E8E93] truncate">{subtitle}</p>}
        </div>
      </div>
      {external ? <ExternalLink className="h-4 w-4 text-[#48484A] flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-[#48484A] flex-shrink-0" />}
    </button>
  );
}

const Divider = () => <div className="h-px bg-[#38383A] ml-[60px]" />;

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div>
      {title && <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">{title}</h2>}
      <div className="rounded-xl overflow-hidden border border-[#C9A063]/30">{children}</div>
    </div>
  );
}

function ArticleView({ article }: { article: HelpArticle }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-xl bg-[#C9A063]/15 text-[#C9A063] flex items-center justify-center"><Icon name={article.icon} className="h-5 w-5" /></div>
        <h2 className="text-white text-[22px] font-bold leading-tight">{article.title}</h2>
      </div>
      <Section title="How it works">
        <ol className="bg-[#1C1C1E] p-4 space-y-3">
          {article.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-[15px] text-[#E5E5EA] leading-snug">
              <span className="w-6 h-6 rounded-full bg-[#C9A063] text-[#111827] text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </Section>
      {article.faqs.length > 0 && (
        <Section title="Questions people ask">
          {article.faqs.map((f, i) => (
            <div key={i} className={i ? "border-t border-[#38383A]" : ""}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-[#1C1C1E] text-left">
                <span className="text-white text-[15px]">{f.question}</span>
                <ChevronDown className={`h-4 w-4 text-[#8E8E93] flex-shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="px-4 pb-4 bg-[#1C1C1E] text-[14px] text-[#AEAEB2] leading-relaxed">{f.answer}</p>}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

export default function HelpPage() {
  const { isAndroid, isIOS, platform } = getPlatformInfo() as any;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory | null>(null);
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import("@capacitor/app").then(({ App }) => App.getInfo())
      .then((info) => setAppVersion(`${info.version} (${info.build})`))
      .catch(() => {});
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [category, article]);

  const results = useMemo(() => (query.trim() ? searchHelp(query) : []), [query]);
  const device = `${isIOS ? "iPhone/iPad" : isAndroid ? "Android" : "Web"}${appVersion ? ` · App ${appVersion}` : ""}`;
  const mail = (subject: string, body = "") =>
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const back = () => { if (article) setArticle(null); else setCategory(null); };
  const title = article ? "" : category ? category.title : "Help & Support";

  return (
    <div className="min-h-screen bg-black">
      <IntroTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A] safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            {category || article ? (
              <button onClick={back} className="flex items-center text-[#0A84FF]" data-testid="button-help-back">
                <ChevronLeft className="h-5 w-5" /><span className="text-[17px]">{article ? (category ? category.title : "Help") : "Help"}</span>
              </button>
            ) : (
              <Link href="/settings">
                <div className="flex items-center text-[#0A84FF] cursor-pointer" data-testid="button-back">
                  <ChevronLeft className="h-5 w-5" /><span className="text-[17px]">Settings</span>
                </div>
              </Link>
            )}
            <Link href="/"><div className="text-[#0A84FF] cursor-pointer" data-testid="button-home"><Home className="h-5 w-5" /></div></Link>
          </div>
          {title && <h1 className="text-[34px] font-bold text-white px-4 pb-2">{title}</h1>}
        </div>

        <div className="py-6 px-4 space-y-8" style={{ paddingBottom: isAndroid ? "120px" : "80px" }}>
          {article ? (
            <ArticleView article={article} />
          ) : category ? (
            <Section>
              {category.articles.map((a, i) => (
                <div key={a.id}>
                  {i > 0 && <Divider />}
                  <Row icon={<Icon name={a.icon} className="h-4 w-4" />} title={a.title} onClick={() => setArticle(a)} />
                </div>
              ))}
            </Section>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help…"
                  className="w-full rounded-xl bg-[#1C1C1E] border border-[#38383A] pl-9 pr-9 py-2.5 text-[15px] text-white placeholder:text-[#8E8E93] outline-none focus:border-[#C9A063]"
                  data-testid="input-help-search" />
                {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" aria-label="Clear search"><X className="h-4 w-4" /></button>}
              </div>

              {query.trim() ? (
                results.length ? (
                  <Section title={`${results.length} result${results.length === 1 ? "" : "s"}`}>
                    {results.map((a, i) => (
                      <div key={a.id}>
                        {i > 0 && <Divider />}
                        <Row icon={<Icon name={a.icon} className="h-4 w-4" />} title={a.title}
                          subtitle={helpCategories.find((c) => c.articles.includes(a))?.title}
                          onClick={() => { setCategory(helpCategories.find((c) => c.articles.includes(a)) ?? null); setArticle(a); }} />
                      </div>
                    ))}
                  </Section>
                ) : (
                  <p className="text-center text-[#8E8E93] text-sm py-6">No results for "{query}". Try another word, or email us below.</p>
                )
              ) : (
                <>
                  <Section>
                    <Row icon={<Compass className="h-4 w-4" />} title="Take the App Tour" subtitle="A quick walkthrough with Reem" onClick={() => setTourOpen(true)} accent testId="button-start-tour" />
                  </Section>

                  <Section title="Topics">
                    {helpCategories.map((c, i) => (
                      <div key={c.id}>
                        {i > 0 && <Divider />}
                        <Row icon={<Icon name={c.icon} className="h-4 w-4" />} title={c.title} subtitle={c.description} onClick={() => setCategory(c)} testId={`help-topic-${c.id}`} />
                      </div>
                    ))}
                  </Section>
                </>
              )}

              <Section title="Still stuck?">
                <Row icon={<Mail className="h-4 w-4" />} title="Contact Support" subtitle="We usually reply within 24 hours" external
                  onClick={() => openLink(mail("Reems Rude Reminders — Support", `\n\n—\nDevice: ${device}`))} testId="link-contact-support" />
                <Divider />
                <Row icon={<Bug className="h-4 w-4" />} title="Report a Bug" subtitle="Tell us what went wrong" external accent
                  onClick={() => openLink(mail("Reems Rude Reminders — Bug Report", `What happened:\n\nWhat I expected:\n\nSteps to repeat it:\n\n—\nDevice: ${device}`))} testId="link-report-bug" />
                <Divider />
                <Row icon={<Icon name="Lightbulb" className="h-4 w-4" />} title="Suggest a Feature" subtitle="Ideas make Reem better" external
                  onClick={() => openLink(mail("Reems Rude Reminders — Feature Idea", `My idea:\n\n—\nDevice: ${device}`))} testId="link-suggest-feature" />
              </Section>

              <Section title="Legal">
                <Row icon={<Icon name="Shield" className="h-4 w-4" />} title="Privacy Policy" onClick={() => openLink(PRIVACY_URL)} external />
                <Divider />
                <Row icon={<Icon name="FileText" className="h-4 w-4" />} title="Terms of Use" onClick={() => openLink(TERMS_URL)} external />
              </Section>

              <p className="text-center text-[12px] text-[#636366]">Reems Rude Reminders{appVersion ? ` · v${appVersion}` : ""}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
