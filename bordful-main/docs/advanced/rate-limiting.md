---
title: Rate Limiting Implementation
description: Learn about Bordful's rate limiting system that protects API endpoints from abuse.
lastUpdated: "2025-05-22"
---

# Rate Limiting Implementation

## Overview

This document describes the rate limiting implementation for the subscription API endpoint in the Bordful application. The rate limiter protects the API from abuse by limiting the number of requests a client can make within a specific time window.

## Implementation Details

The rate limiting solution is implemented in `app/api/subscribe/route.ts` and uses an in-memory approach to track and limit requests.

### Key Components

1. **Rate Limit Storage**: Uses a JavaScript `Map` to store rate limit information for each client IP address.

```typescript
// Map to store rate limit information for each IP
const rateLimitMap = new Map<string, RateLimitInfo>();

interface RateLimitInfo {
  count: number;
  resetTime: number;
}
```

2. **Configuration Parameters**:

```typescript
// Rate limiting configuration
const MAX_REQUESTS_PER_WINDOW = 5; // Maximum number of requests allowed in the time window
const WINDOW_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds
```

3. **Rate Limit Check Function**:

```typescript
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  
  // Get current rate limit info for this IP
  const rateLimitInfo = rateLimitMap.get(ip);
  
  // If no previous requests or reset time has passed, initialize/reset the counter
  if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + WINDOW_DURATION_MS
    });
    return false;
  }
  
  // If under the limit, increment the counter
  if (rateLimitInfo.count < MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, {
      count: rateLimitInfo.count + 1,
      resetTime: rateLimitInfo.resetTime
    });
    return false;
  }
  
  // Rate limit exceeded
  return true;
}
```

4. **Integration with API Route**:

```typescript
export async function POST(request: Request) {
  try {
    // Get client IP address
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check if rate limited
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Continue with normal request processing...
  } catch (error) {
    // Error handling...
  }
}
```

5. **Client-Side Handling**:

The client-side form component (`components/job-alerts/JobAlertsForm.tsx`) handles rate limit responses by displaying a user-friendly error message:

```typescript
// Inside handleSubmit function
if (response.status === 429) {
  toast({
    title: "Rate limit exceeded",
    description: "Too many requests. Please try again later.",
    variant: "destructive",
  });
  return;
}
```

## Limitations

The current implementation has some limitations:

1. **In-memory storage**: Rate limit data is lost on server restart and doesn't persist across multiple server instances.
2. **IP-based identification**: Relies solely on IP addresses, which can be problematic for users behind shared IPs.
3. **Fixed rate limit**: Uses the same rate limit for all clients without differentiation.

## Future Improvements

Potential improvements for the future:

1. **Persistent storage**: Implement Redis or another distributed cache for rate limit data.
2. **Graduated rate limiting**: Implement progressive rate limiting that slows down requests before blocking them.
3. **Rate limit headers**: Add standard rate limit headers to responses.
4. **Whitelisting**: Add support for whitelisting certain IPs.
5. **Enhanced monitoring**: Add logging of rate limit events for security monitoring.

## Testing

To test the rate limiting functionality:

1. Submit the subscription form multiple times in quick succession.
2. After 5 submissions within an hour, you should receive a "Rate limit exceeded" error message.
3. The rate limit will reset after one hour. 