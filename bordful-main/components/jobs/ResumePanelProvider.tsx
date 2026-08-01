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

// Wraps a job page's content: when the tailoring panel opens, the wrapped
// content gets pushed left (margin-right, desktop only) to make room for the
// panel on the right, rather than the panel floating over everything as a
// plain overlay. The margin tracks the panel's collapsed/expanded width so
// the push stays in sync when the user widens the panel.
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
