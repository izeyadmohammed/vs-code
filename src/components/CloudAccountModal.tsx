import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import {
  X,
  CloudUpload,
  CloudDownload,
  LogOut,
  Check,
  Copy,
  Database,
  UserCheck,
} from 'lucide-react';
import { ThemeConfig } from '../types/ide';
import {
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signOutSupabase,
  SUPABASE_WORKSPACES_SQL,
} from '../lib/supabase';

interface CloudAccountModalProps {
  theme: ThemeConfig;
  isOpen: boolean;
  user: User | null;
  syncing: boolean;
  lastSyncedAt: string | null;
  syncMode: 'table' | 'metadata' | null;
  onClose: () => void;
  onPushWorkspace: () => Promise<void>;
  onPullWorkspace: () => Promise<void>;
}

export const CloudAccountModal: React.FC<CloudAccountModalProps> = ({
  theme,
  isOpen,
  user,
  syncing,
  lastSyncedAt,
  syncMode,
  onClose,
  onPushWorkspace,
  onPullWorkspace,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const c = theme.colors;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setAuthLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) setErrorMsg(error.message);
        else setInfoMsg('Signed in successfully to Supabase.');
      } else {
        const { data, error } = await signUpWithEmail(email.trim(), password);
        if (error) setErrorMsg(error.message);
        else if (!data.session) {
          setInfoMsg('Account created! Check your email to confirm, or sign in if confirmation is disabled.');
        } else {
          setInfoMsg('Account created and signed in!');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-[6px] shadow-2xl overflow-hidden text-[13px]"
        style={{
          backgroundColor: c.dropdownBg,
          border: `1px solid ${c.dropdownBorder}`,
          color: c.sidebarFg,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{ borderColor: c.dropdownBorder }}
        >
          <div className="flex items-center gap-2 font-semibold">
            <Database size={16} style={{ color: c.accent }} />
            <span>Supabase Cloud Sync &amp; Accounts</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {!isSupabaseConfigured ? (
            <div className="p-3 rounded text-[12px] bg-amber-500/10 border border-amber-500/30">
              Supabase environment variables are not configured.
            </div>
          ) : !user ? (
            <form onSubmit={handleAuth} className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: c.dropdownBorder }}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className="px-3 py-1 rounded text-[12px] font-medium"
                  style={{
                    backgroundColor: mode === 'signin' ? c.listActiveBg : 'transparent',
                    color: mode === 'signin' ? c.listActiveFg : c.sidebarFg,
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className="px-3 py-1 rounded text-[12px] font-medium"
                  style={{
                    backgroundColor: mode === 'signup' ? c.listActiveBg : 'transparent',
                    color: mode === 'signup' ? c.listActiveFg : c.sidebarFg,
                  }}
                >
                  Create Account
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-[12px] opacity-80">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full h-[32px] px-2.5 rounded-[3px] outline-none text-[13px]"
                  style={{
                    backgroundColor: c.inputBg,
                    color: c.inputFg,
                    border: `1px solid ${c.inputBorder}`,
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[12px] opacity-80">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full h-[32px] px-2.5 rounded-[3px] outline-none text-[13px]"
                  style={{
                    backgroundColor: c.inputBg,
                    color: c.inputFg,
                    border: `1px solid ${c.inputBorder}`,
                  }}
                />
              </div>

              {errorMsg && (
                <div className="p-2 rounded text-[12px] bg-red-500/15 text-red-400">
                  {errorMsg}
                </div>
              )}
              {infoMsg && (
                <div className="p-2 rounded text-[12px] bg-emerald-500/15 text-emerald-400">
                  {infoMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-[32px] rounded-[3px] font-medium text-[13px] disabled:opacity-50"
                style={{ backgroundColor: c.buttonBg, color: c.buttonFg }}
              >
                {authLoading
                  ? 'Connecting...'
                  : mode === 'signin'
                  ? 'Sign In to Sync Workspace'
                  : 'Create Supabase Account'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div
                className="p-3 rounded-[4px] flex items-center justify-between"
                style={{
                  backgroundColor: c.inputBg,
                  border: `1px solid ${c.inputBorder}`,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserCheck size={18} style={{ color: '#4ade80' }} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{user.email}</div>
                    <div className="text-[11px] opacity-65">
                      Connected to Supabase
                      {lastSyncedAt ? ` · Last sync ${new Date(lastSyncedAt).toLocaleTimeString()}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOutSupabase()}
                  className="px-2.5 py-1 rounded text-[11px] flex items-center gap-1 hover:bg-white/10 shrink-0"
                  style={{ border: `1px solid ${c.inputBorder}` }}
                >
                  <LogOut size={12} />
                  Sign Out
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={syncing}
                  onClick={onPushWorkspace}
                  className="h-[34px] px-3 rounded-[3px] font-medium text-[12px] flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: c.buttonBg, color: c.buttonFg }}
                >
                  <CloudUpload size={14} />
                  <span>{syncing ? 'Syncing...' : 'Save to Cloud'}</span>
                </button>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={onPullWorkspace}
                  className="h-[34px] px-3 rounded-[3px] font-medium text-[12px] flex items-center justify-center gap-2 hover:bg-white/10 disabled:opacity-50"
                  style={{ border: `1px solid ${c.inputBorder}` }}
                >
                  <CloudDownload size={14} />
                  <span>Load from Cloud</span>
                </button>
              </div>

              <div
                className="p-3 rounded-[4px] space-y-2 text-[11px]"
                style={{
                  backgroundColor: c.editorBg,
                  border: `1px solid ${c.dropdownBorder}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold opacity-85">
                    {syncMode === 'table'
                      ? 'Postgres Table Active (public.vscode_workspaces)'
                      : 'Optional: Create Postgres Table for Full Multi-Project Storage'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(SUPABASE_WORKSPACES_SQL);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10"
                    style={{ color: c.accent }}
                  >
                    {copiedSql ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                  </button>
                </div>
                <pre className="font-mono text-[10.5px] opacity-75 overflow-x-auto whitespace-pre">
                  {SUPABASE_WORKSPACES_SQL}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
