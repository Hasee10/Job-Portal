'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function DeclineInvitationButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Button
      disabled={isSubmitting}
      onClick={async () => {
        setIsSubmitting(true);
        try {
          const res = await fetch(`/api/procurement/vendor/requests/${requestId}/decline`, {
            method: 'POST',
          });
          if (!res.ok) throw new Error((await res.json()).error || 'Failed to decline.');
          router.refresh();
        } catch (error) {
          toast({
            title: 'Could not decline',
            description: error instanceof Error ? error.message : 'Something went wrong.',
            variant: 'destructive',
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
      size="sm"
      variant="ghost"
    >
      Decline invitation
    </Button>
  );
}
