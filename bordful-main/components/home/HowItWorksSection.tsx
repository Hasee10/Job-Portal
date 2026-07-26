import { FileText, Sparkles, Send } from 'lucide-react';

const STEPS = [
  {
    icon: FileText,
    title: 'Create your profile',
    description: 'Sign in and build or upload a resume in minutes.',
  },
  {
    icon: Sparkles,
    title: 'Get matched by AI',
    description:
      'We parse your skills and surface roles that actually fit - no keyword guesswork.',
  },
  {
    icon: Send,
    title: 'Apply in one click',
    description:
      'Apply directly from the board, or let recruiters find and reach out to you.',
  },
] as const;

export function HowItWorksSection() {
  return (
    <div className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-center font-semibold text-xl tracking-tight">
          How it works
        </h2>
        <div className="mx-auto mt-8 grid max-w-4xl gap-6 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, description }, i) => (
            <div className="text-center" key={title}>
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="mt-3 font-semibold text-sm">
                <span className="text-muted-foreground">{i + 1}. </span>
                {title}
              </p>
              <p className="mt-1.5 text-muted-foreground text-sm">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
