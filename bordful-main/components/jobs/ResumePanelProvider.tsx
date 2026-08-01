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
// content gets pushed left (margin-right) to make room for the panel on the
// right, rather than the panel floating over everything as a plain overlay.
export function ResumePanelProvider({ children }: { children: React.ReactNode }) {
  const [job, setJob] = useState<PanelJobRef | null>(null);
  const isOpen = job !== null;

  return (
    <ResumePanelContext.Provider value={{ open: setJob }}>
      <div className={cn('transition-[margin] duration-300 ease-in-out', isOpen && 'lg:mr-[440px]')}>
        {children}
      </div>
      {job && <TailoredResumePanel job={job} onClose={() => setJob(null)} />}
    </ResumePanelContext.Provider>
  );
}
