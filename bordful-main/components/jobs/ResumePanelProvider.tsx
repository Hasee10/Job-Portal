'use client';

import { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { TailoredResumePanel } from './TailoredResumePanel';

export type PanelJobRef = { id: string; title: string; company: string };

type ResumePanelContextValue = {
  open: (job: PanelJobRef) => void;
};

const ResumePanelContext = createContext<ResumePanelContextValue | null>(null);

// Thrown deliberately (not fail-soft) - a component calling this outside the
// provider is a real wiring bug, not a runtime edge case to paper over.
export function useResumePanel(): ResumePanelContextValue {
  const ctx = useContext(ResumePanelContext);
  if (!ctx) {
    throw new Error('useResumePanel must be used within a ResumePanelProvider');
  }
  return ctx;
}

// Mounted once in the root layout (wrapping Nav + page content + Footer) so
// that opening the tailoring panel pushes the whole site chrome left
// (margin-right, desktop only) in sync, not just the job page's own content
// - otherwise the nav bar stays full-width and gets hidden behind the fixed
// panel. The margin tracks the panel's collapsed/expanded width so the push
// stays in sync when the user widens the panel.
export function ResumePanelProvider({ children }: { children: React.ReactNode }) {
  const [job, setJob] = useState<PanelJobRef | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const isOpen = job !== null;

  return (
    <ResumePanelContext.Provider
      value={{
        open: (nextJob) => {
          setJob(nextJob);
          setIsExpanded(false);
        },
      }}
    >
      <div
        className={cn(
          'transition-[margin] duration-300 ease-in-out',
          isOpen && (isExpanded ? 'lg:mr-[760px]' : 'lg:mr-[440px]')
        )}
      >
        {children}
      </div>
      {job && (
        <TailoredResumePanel
          isExpanded={isExpanded}
          job={job}
          onClose={() => setJob(null)}
          onToggleExpand={() => setIsExpanded((v) => !v)}
        />
      )}
    </ResumePanelContext.Provider>
  );
}
