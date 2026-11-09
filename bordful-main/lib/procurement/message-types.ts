// Shared between the server actions and the client conversation UI.
//
// Separate from message-actions.ts because that module is "server-only": a
// client component importing a runtime value from it would fail the build.
// Types alone would be erased, but MESSAGE_MAX_LENGTH is a real value the
// textarea needs, so it lives here instead of being duplicated. Same split
// as lib/jobs/tailored-resume-types.ts.

export const MESSAGE_MAX_LENGTH = 4000;
export const MESSAGES_PAGE_SIZE = 50;

export interface OrganizationMessage {
  body: string;
  createdAt: string;
  id: string;
  // True when the organization currently being viewed sent this message, so
  // the UI does not have to compare ids itself.
  isOwn: boolean;
  senderOrgId: string;
  senderOrgName: string | null;
}

export interface MessagePage {
  messages: OrganizationMessage[];
  page: number;
  pageCount: number;
  total: number;
}
