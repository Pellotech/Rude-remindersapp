import { useState, useEffect } from "react";
import { X, Search, ChevronRight, Compass, ChevronLeft } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { helpCategories, searchHelp, type HelpArticle as HelpArticleType, type HelpCategory } from "@/lib/helpContent";
import { HelpArticle } from "./HelpArticle";
import logoImage from "@assets/translusant_logo2_1767108484844.png";

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

export function HelpCenter({ isOpen, onClose, onStartTour }: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticleType | null>(null);
  const [searchResults, setSearchResults] = useState<HelpArticleType[]>([]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(searchHelp(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    const lastSection = localStorage.getItem('help_last_section');
    if (lastSection && isOpen) {
      const category = helpCategories.find(c => c.id === lastSection);
      if (category) {
        setSelectedCategory(category);
      }
    }
  }, [isOpen]);

  const handleCategorySelect = (category: HelpCategory) => {
    setSelectedCategory(category);
    localStorage.setItem('help_last_section', category.id);
  };

  const handleBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
      localStorage.removeItem('help_last_section');
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedArticle(null);
    onClose();
  };

  const getIconComponent = (iconName: string) => {
    return (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DrawerContent className="max-h-[85vh] bg-[#C9A063]">
        <DrawerHeader className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#B8914F]">
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="Rude Reminders" className="h-7 w-auto" />
              <DrawerTitle className="font-semibold text-white text-base">Help Center</DrawerTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0 text-white hover:bg-white/20">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0" style={{ maxHeight: "calc(85vh - 80px)" }}>
          {selectedArticle ? (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <HelpArticle article={selectedArticle} onBack={handleBack} />
            </div>
          ) : selectedCategory ? (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="sticky top-0 z-10 bg-white border-b p-3 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                {(() => {
                  const IconComp = getIconComponent(selectedCategory.icon);
                  return <IconComp className="h-5 w-5 text-[#C9A063]" />;
                })()}
                <h2 className="font-semibold text-gray-900">{selectedCategory.title}</h2>
              </div>
              <div className="p-4 space-y-2">
                {selectedCategory.articles.map((article) => {
                  const ArticleIcon = getIconComponent(article.icon);
                  return (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#C9A063]/10 rounded-full flex items-center justify-center">
                          <ArticleIcon className="h-5 w-5 text-[#C9A063]" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{article.title}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search help..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-0 shadow-sm"
                />
              </div>

              {searchQuery.trim() ? (
                <div className="space-y-2">
                  {searchResults.length > 0 ? (
                    searchResults.map((article) => {
                      const ArticleIcon = getIconComponent(article.icon);
                      return (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#C9A063]/10 rounded-full flex items-center justify-center">
                              <ArticleIcon className="h-5 w-5 text-[#C9A063]" />
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{article.title}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                      <p className="text-gray-500 text-sm">No results found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {onStartTour && (
                    <button
                      onClick={() => { onStartTour(); handleClose(); }}
                      className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border-2 border-[#C53B3B]/20 hover:border-[#C53B3B] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#C53B3B]/10 rounded-full flex items-center justify-center">
                          <Compass className="h-5 w-5 text-[#C53B3B]" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900 text-sm">Start App Tour</p>
                          <p className="text-xs text-gray-500">Quick walkthrough of features</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#C53B3B]" />
                    </button>
                  )}

                  <div className="space-y-2">
                    {helpCategories.map((category) => {
                      const CategoryIcon = getIconComponent(category.icon);
                      return (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category)}
                          className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#C9A063]/10 rounded-full flex items-center justify-center">
                              <CategoryIcon className="h-5 w-5 text-[#C9A063]" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{category.title}</p>
                              <p className="text-xs text-gray-500">{category.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
