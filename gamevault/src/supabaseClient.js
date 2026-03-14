// ─────────────────────────────────────────────────────────────────────────────
//  supabaseClient.js
//  Game Vault — single import for all database access.
//  Place this file in your src/ folder next to App.jsx.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = "https://gqxkxesqlbeordfsykkd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-S_cDaPMopEfvusEjCDFxA_6hY-1UgX";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    storageKey:         "gv_session",
    detectSessionInUrl: true,
  },
});

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

export async function sbSignUp(email, password, username, referralCode) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { username, referral_code: referralCode || null } },
  });
}

export async function sbSignIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function sbSignOut() {
  return supabase.auth.signOut();
}

// ─── PROFILE HELPERS ──────────────────────────────────────────────────────────

export async function getProfile(userId) {
  return supabase.from("profiles").select("*").eq("id", userId).single();
}

export async function upsertProfile(profile) {
  return supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select()
    .single();
}

export async function updateProfile(userId, updates) {
  return supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
}

// ─── WAGER HELPERS ────────────────────────────────────────────────────────────

export async function insertWager(wager) {
  return supabase.from("wagers").insert(wager).select().single();
}

export async function getUserWagers(userId) {
  return supabase
    .from("wagers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function patchWager(wagerId, updates) {
  return supabase.from("wagers").update(updates).eq("id", wagerId).select().single();
}

// ─── TRANSACTION HELPERS ──────────────────────────────────────────────────────

export async function insertTransaction(tx) {
  return supabase.from("transactions").insert(tx).select().single();
}

export async function getUserTransactions(userId) {
  return supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
}
