import { ChevronLeft, Mail, Bug } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { HelpArticle as HelpArticleType } from "@/lib/helpContent";

interface HelpArticleProps {
  article: HelpArticleType;
  onBack: () => void;
}

export function HelpArticle({ article, onBack }: HelpArticleProps) {
  const [openFaqs, setOpenFaqs] = useState<number[]>([]);

  const toggleFaq = (index: number) => {
    setOpenFaqs(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const IconComponent = (LucideIcons as any)[article.icon] || LucideIcons.HelpCircle;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <IconComponent className="h-5 w-5 text-[#C9A063]" />
        <h2 className="font-semibold text-gray-900 text-sm">{article.title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-medium text-gray-900 mb-3 text-sm">How it works</h3>
          <ul className="space-y-2">
            {article.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 bg-[#C9A063] text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {article.faqs.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-3 text-sm">Frequently Asked</h3>
            <div className="space-y-2">
              {article.faqs.map((faq, index) => (
                <Collapsible key={index} open={openFaqs.includes(index)} onOpenChange={() => toggleFaq(index)}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-left">
                    <span className="text-sm font-medium text-gray-800 pr-2">{faq.question}</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${openFaqs.includes(index) ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-2 pb-2">
                    <p className="text-sm text-gray-600">{faq.answer}</p>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-medium text-gray-900 mb-3 text-sm">Need more help?</h3>
          <div className="space-y-2">
            <a 
              href="mailto:ruderemindersinfo@gmail.com?subject=Support%20Request"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Mail className="h-5 w-5 text-[#C9A063]" />
              <div>
                <p className="text-sm font-medium text-gray-900">Contact Support</p>
                <p className="text-xs text-gray-500">Get help from our team</p>
              </div>
            </a>
            <a 
              href="mailto:ruderemindersinfo@gmail.com?subject=Bug%20Report&body=Device:%20%0AiOS%20Version:%20%0AApp%20Version:%20%0A%0ADescribe%20the%20issue:%0A"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Bug className="h-5 w-5 text-[#C53B3B]" />
              <div>
                <p className="text-sm font-medium text-gray-900">Report a Bug</p>
                <p className="text-xs text-gray-500">Help us improve the app</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
