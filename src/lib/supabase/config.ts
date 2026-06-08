export function studioFlowChannelName(flowId: string) {
  return `studio-flow:${flowId}`;
}

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

export function getSupabaseBroadcastKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || getSupabaseAnonKey();
}

export function isSupabaseRealtimeConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
