import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/smtp';
import {
  closeForResponses,
  listPublishedRequestsPastDeadline,
  listRequestsWithUpcomingDeadline,
} from '@/lib/procurement/request-actions';
import { listInvitationsForRequest } from '@/lib/procurement/invitation-actions';
import { renderProcurementDeadlineReminderEmail } from '@/lib/email/templates/procurement-deadline-reminder';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const REMINDER_WINDOW_HOURS = 24;
const PENDING_INVITATION_STATUSES = [
  'invited',
  'prequalification_pending',
  'prequalification_approved',
  'viewed',
];

// Never auto-opens sealed bids - that stays a deliberate, audit-logged buyer
// action (see openBids in response-actions.ts). This sweep only handles the
// two things that are safe to automate: closing a request once its deadline
// has passed, and reminding vendors who haven't responded yet.
async function closeExpiredRequests(): Promise<number> {
  const expired = await listPublishedRequestsPastDeadline();
  let closed = 0;
  for (const request of expired) {
    try {
      await closeForResponses(request.buyerId, request.id);
      closed++;
    } catch (error) {
      console.error(`[cron/procurement-sweep] Failed to close request ${request.id}:`, error);
    }
  }
  return closed;
}

async function sendDeadlineReminders(): Promise<number> {
  const upcoming = await listRequestsWithUpcomingDeadline(REMINDER_WINDOW_HOURS);
  let sent = 0;

  for (const request of upcoming) {
    try {
      const invitations = await listInvitationsForRequest(request.buyerId, request.id);
      const pending = invitations.filter((inv) => PENDING_INVITATION_STATUSES.includes(inv.status));

      for (const invitation of pending) {
        if (!invitation.vendorEmail) continue;
        const { subject, html } = renderProcurementDeadlineReminderEmail({
          requestTitle: request.title,
          responseDeadline: request.responseDeadline as string,
          respondUrl: `${process.env.NEXTAUTH_URL ?? ''}/procurement/vendor/requests/${request.id}`,
        });
        await sendEmail({ to: invitation.vendorEmail, subject, html });
        sent++;
      }
    } catch (error) {
      console.error(
        `[cron/procurement-sweep] Failed to send deadline reminders for request ${request.id}:`,
        error
      );
    }
  }

  return sent;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const closed = await closeExpiredRequests();
  const remindersSent = await sendDeadlineReminders();

  return NextResponse.json({ ok: true, closed, remindersSent });
}
