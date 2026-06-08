"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function isSupabaseRealtimeAvailable() {
  return Boolean(
    typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;

  browserClient ??= createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 24,
      },
    },
  });

  return browserClient;
}
