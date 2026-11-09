import "server-only";

import { NextResponse } from "next/server";
import { ConnectionError } from "./connection-actions";
import { InvitationError } from "./organization-invitation-actions";

// Shared error translation for the M3A routes, so every one of them maps a
// failure the same way and no route invents its own status codes.
//
// The codes come from the action layer, which is where authorization is
// decided. Routes do not re-derive them: a route that guessed "forbidden"
// from a message string would drift the moment a message is reworded.
const STATUS_BY_CODE: Record<string, number> = {
  db_unavailable: 503,
  duplicate: 409,
  forbidden: 403,
  invalid_capabilities: 422,
  invalid_role: 422,
  invalid_token: 400,
  last_owner: 409,
  not_found: 404,
  not_pending: 409,
  self_connection: 422,
};

export function networkErrorResponse(
  error: unknown,
  fallback: string
): NextResponse {
  if (error instanceof ConnectionError || error instanceof InvitationError) {
    return NextResponse.json(
      { error: error.message },
      { status: STATUS_BY_CODE[error.code] ?? 400 }
    );
  }
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}
