import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { EditorSettings, FSNode } from '../types/ide';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export interface CloudWorkspaceRecord {
  id: string;
  user_id: string;
  name: string;
  files: FSNode[];
  settings: EditorSettings;
  updated_at: string;
}

export const SUPABASE_WORKSPACES_SQL = `-- Run this SQL in your Supabase SQL Editor to enable multi-project table storage:
create table if not exists public.vscode_workspaces (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  files jsonb not null,
  settings jsonb not null,
  updated_at timestamptz default now() not null
);

alter table public.vscode_workspaces enable row level security;

create policy "Users manage their own workspaces"
  on public.vscode_workspaces
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);`;

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.signUp({ email, password });
}

export async function signOutSupabase() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

export async function pushWorkspaceToSupabase(
  user: User,
  workspaceName: string,
  files: FSNode[],
  settings: EditorSettings
): Promise<{ mode: 'table' | 'metadata'; updatedAt: string }> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const now = new Date().toISOString();

  // Attempt structured Postgres table sync first
  const { error: tableErr } = await supabase.from('vscode_workspaces').upsert({
    id: `${user.id}:${workspaceName}`,
    user_id: user.id,
    name: workspaceName,
    files,
    settings,
    updated_at: now,
  });

  if (!tableErr) {
    return { mode: 'table', updatedAt: now };
  }

  // Fallback seamlessly to Supabase Auth User Metadata if table hasn't been created yet
  const { error: metaErr } = await supabase.auth.updateUser({
    data: {
      vscode_workspace_name: workspaceName,
      vscode_files: files,
      vscode_settings: settings,
      vscode_synced_at: now,
    },
  });

  if (metaErr) {
    throw new Error(metaErr.message);
  }

  return { mode: 'metadata', updatedAt: now };
}

export async function pullWorkspaceFromSupabase(
  user: User,
  workspaceName: string
): Promise<{
  files?: FSNode[];
  settings?: EditorSettings;
  name?: string;
  updatedAt?: string;
  mode: 'table' | 'metadata' | 'empty';
}> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('vscode_workspaces')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return {
      files: data.files as FSNode[],
      settings: data.settings as EditorSettings,
      name: data.name as string,
      updatedAt: data.updated_at as string,
      mode: 'table',
    };
  }

  // Check Auth User Metadata
  const meta = user.user_metadata;
  if (meta?.vscode_files && Array.isArray(meta.vscode_files)) {
    return {
      files: meta.vscode_files as FSNode[],
      settings: meta.vscode_settings as EditorSettings | undefined,
      name: (meta.vscode_workspace_name as string) || workspaceName,
      updatedAt: meta.vscode_synced_at as string | undefined,
      mode: 'metadata',
    };
  }

  return { mode: 'empty' };
}
