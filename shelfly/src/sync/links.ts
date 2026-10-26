import type { EmailOtpType } from '@supabase/supabase-js';

// The sign-in link from Supabase's email (…/auth/v1/verify?token=…&type=…) → its one-time token.
export function signInLink(text: string): { tokenHash: string; type: EmailOtpType } | null {
  const token = text.match(/[?&]token=([^&\s]+)/)?.[1];
  if (!token) return null;
  const type = (text.match(/[?&]type=([a-z_]+)/)?.[1] ?? 'email') as EmailOtpType;
  return { tokenHash: decodeURIComponent(token), type };
}
