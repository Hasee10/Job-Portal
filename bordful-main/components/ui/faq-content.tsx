"use client";

import { Link as LinkIcon, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import type { Answer, FAQPage, Question, WithContext } from "schema-dts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import config from "@/config";
import { resolveColor } from "@/lib/utils/colors";
import { safeJsonLdStringify } from "@/lib/utils/json-ld";
import { slugify } from "@/lib/utils/slugify";

// Define the types based on the config
type FAQItem = {
  question: string;
  answer: string;
  isRichText?: boolean;
};

// We're using this interface in the ReadonlyArray type below
// biome-ignore lint/correctness/noUnusedVariables: Type needed for ReadonlyArray type
type FAQCategory = {
  title: string;
  items: FAQItem[];
};

type FAQContentProps = {
  categories: ReadonlyArray<{
    readonly title: string;
    readonly items: ReadonlyArray<{
      readonly question: string;
      readonly answer: string;
      readonly isRichText?: boolean;
    }>;
  }>;
};

// Generate a stable ID for each FAQ item – pure function, no component dependencies
const getItemId = (categoryTitle: string, question: string) =>
  `${slugify(categoryTitle)}-${slugify(question)}`;

export function FAQContent({ categories }: FAQContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Apply search – updates state only, no URL side-effect.
  // Used by the URL-sync effect to avoid triggering a URL write during init.
  const applySearch = useCallback(
    (value: string) => {
      setSearchTerm(value);

      if (!value.trim()) {
        setExpandedItems([]);
        return;
      }

      const matchingItems: string[] = [];

      for (const category of categories) {
        for (const item of category.items) {
          const questionMatch = item.question
            .toLowerCase()
            .includes(value.toLowerCase());
          const answerMatch = item.answer
            .toLowerCase()
            .includes(value.toLowerCase());

          if (questionMatch || answerMatch) {
            matchingItems.push(getItemId(category.title, item.question));
          }
        }
      }

      setExpandedItems(matchingItems);
    },
    [categories]
  );

  // Handle search triggered by user input – updates state AND the URL.
  const handleSearch = useCallback(
    (value: string) => {
      applySearch(value);

      if (value.trim()) {
        router.replace(`/faq?q=${encodeURIComponent(value)}`, {
          scroll: false,
        });
      } else {
        router.replace("/faq", { scroll: false });
      }
    },
    [applySearch, router]
  );

  // Sync state from URL params on mount / when search params change.
  // Uses applySearch (no URL write) to avoid a write-then-read render loop.
  useEffect(() => {
    const query = searchParams.get("q");
    applySearch(query || "");

    // Check for hash in URL for anchor links
    const hash = window.location.hash;
    if (hash) {
      const categoryId = hash.substring(1); // Remove the # character
      const timerId = setTimeout(() => {
        const element = document.getElementById(categoryId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });

          // Find and expand the items in this category
          const categoryIndex = categories.findIndex(
            (cat) => slugify(cat.title) === categoryId
          );
          if (categoryIndex !== -1) {
            const category = categories[categoryIndex];
            const itemIds = category.items.map((item) =>
              getItemId(category.title, item.question)
            );
            setExpandedItems(itemIds);
          }
        }
      }, 100);

      return () => clearTimeout(timerId);
    }
  }, [searchParams, categories, applySearch]);

  // Handle keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchTerm("");
      setExpandedItems([]);
      router.replace("/faq", { scroll: false });
    }
  };

  // Generate FAQ schema for SEO
  const generateFAQSchema = () => {
    // Create type-safe schema using schema-dts
    const faqSchema: WithContext<FAQPage> = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: categories.flatMap((category) =>
        category.items.map(
          (item) =>
            ({
              "@type": "Question",
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              } as Answer,
              name: item.question,
            }) as Question
        )
      ),
    };

    return safeJsonLdStringify(faqSchema);
  };

  // Filter categories based on search term
  const filteredCategories = searchTerm.trim()
    ? categories
        .map((category) => ({
          ...category,
          items: category.items.filter(
            (item) =>
              item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.answer.toLowerCase().includes(searchTerm.toLowerCase())
          ),
        }))
        .filter((category) => category.items.length > 0)
    : categories;

  return (
    <>
      {/* FAQ Schema for SEO */}
      <script
        dangerouslySetInnerHTML={{ __html: generateFAQSchema() }}
        type="application/ld+json"
      />

      {/* Search Bar */}
      <div className="mb-8 w-full">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search FAQs"
            className="h-12 rounded-xl bg-card pl-10 pr-10"
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search questions, accounts, tenders…"
            type="text"
            value={searchTerm}
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
              onClick={() => {
                setSearchTerm("");
                setExpandedItems([]);
                router.replace("/faq", { scroll: false });
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* FAQ Content */}
      <div className="space-y-10">
        {filteredCategories.length === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              No results found for &quot;{searchTerm}&quot;
            </p>
            <Button
              onClick={() => {
                setSearchTerm("");
                setExpandedItems([]);
                router.replace("/faq", { scroll: false });
              }}
              size="xs"
              variant="outline"
            >
              Clear Search
            </Button>
          </div>
        ) : (
          filteredCategories.map((category) => {
            const categoryId = slugify(category.title);
            return (
              <div
                className="scroll-mt-28 space-y-5"
                id={categoryId}
                key={category.title}
                ref={(el) => {
                  categoryRefs.current[categoryId] = el;
                }}
              >
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                    {category.title}
                  </h2>
                  <button
                    type="button"
                    aria-label={`Copy link to ${category.title} section`}
                    className="text-muted-foreground transition-colors hover:text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/faq#${categoryId}`
                      );
                      // You could add a toast notification here
                    }}
                    title="Copy link to this section"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                </div>
                <Accordion
                  className="space-y-0 rounded-xl border bg-card px-5"
                  onValueChange={setExpandedItems}
                  type="multiple"
                  value={expandedItems}
                >
                  {category.items.map((item) => {
                    const itemId = getItemId(category.title, item.question);
                    return (
                      <AccordionItem
                        className="overflow-hidden border-b border-border last:border-0"
                        key={itemId}
                        value={itemId}
                      >
                        <AccordionTrigger className="py-4 font-medium text-sm text-zinc-800 hover:no-underline dark:text-zinc-200">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="pt-1 pb-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {item.isRichText ? (
                            <div className="markdown-content">
                              <ReactMarkdown
                                components={{
                                  // Apply primary color to all links in markdown content
                                  a: ({ ...props }) => (
                                    <a
                                      {...props}
                                      className="underline transition-opacity hover:opacity-80"
                                      style={{
                                        color: resolveColor(
                                          config.ui.primaryColor
                                        ),
                                      }}
                                    />
                                  ),
                                }}
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                              >
                                {item.answer}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            item.answer
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
