import React, { useState, useRef, useEffect } from 'react';
import {
  Files,
  Search,
  GitBranch,
  Play,
  Blocks,
  CircleUserRound,
  Settings,
} from 'lucide-react';
import { ActivityView, ThemeConfig } from '../types/ide';

interface ActivityBarProps {
  theme: ThemeConfig;
  activeView: ActivityView;
  sidebarVisible: boolean;
  gitChangesCount: number;
  cloudUserEmail?: string | null;
  onSelectView: (view: ActivityView) => void;
  onOpenSettings: () => void;
  onOpenThemes: () => void;
  onOpenCommandPalette: () => void;
  onOpenCloudSync: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  theme,
  activeView,
  sidebarVisible,
  gitChangesCount,
  cloudUserEmail,
  onSelectView,
  onOpenSettings,
  onOpenThemes,
  onOpenCommandPalette,
  onOpenCloudSync,
}) => {
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const manageRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (manageRef.current && !manageRef.current.contains(e.target as Node)) {
        setManageMenuOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, []);

  const items: Array<{ id: ActivityView; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'explorer', label: 'Explorer (Ctrl+Shift+E)', icon: <Files size={22} strokeWidth={1.6} /> },
    { id: 'search', label: 'Search (Ctrl+Shift+F)', icon: <Search size={22} strokeWidth={1.6} /> },
    {
      id: 'git',
      label: 'Source Control (Ctrl+Shift+G)',
      icon: <GitBranch size={22} strokeWidth={1.6} />,
      badge: gitChangesCount > 0 ? gitChangesCount : undefined,
    },
    { id: 'debug', label: 'Run and Debug (Ctrl+Shift+D)', icon: <Play size={22} strokeWidth={1.6} /> },
    { id: 'extensions', label: 'Extensions (Ctrl+Shift+X)', icon: <Blocks size={22} strokeWidth={1.6} /> },
  ];

  const c = theme.colors;

  return (
    <aside
      className="w-[48px] h-full flex flex-col justify-between items-center py-1 select-none shrink-0 z-30"
      style={{
        backgroundColor: c.activityBarBg,
        borderRight: `1px solid ${c.activityBarBorder}`,
      }}
      aria-label="Activity Bar"
    >
      {/* Top Icons */}
      <div className="flex flex-col w-full">
        {items.map((item) => {
          const isActive = sidebarVisible && activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              title={item.label}
              aria-label={item.label}
              className="relative w-full h-[48px] flex items-center justify-center transition-colors"
              style={{
                color: isActive ? c.activityBarFg : c.activityBarInactiveFg,
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-[2px]"
                  style={{ backgroundColor: c.activityBarIndicator }}
                />
              )}
              {item.icon}
              {item.badge !== undefined && (
                <span
                  className="absolute bottom-2 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center tabular-nums"
                  style={{
                    backgroundColor: c.badgeBg,
                    color: c.badgeFg,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Icons: Accounts & Manage */}
      <div className="flex flex-col w-full items-center pb-1">
        <div className="relative w-full" ref={accountRef}>
          <button
            type="button"
            onClick={() => {
              setAccountMenuOpen((v) => !v);
              setManageMenuOpen(false);
            }}
            title={cloudUserEmail ? `Signed in as ${cloudUserEmail}` : 'Accounts (Supabase Cloud Sync)'}
            aria-label="Accounts"
            className="w-full h-[46px] flex items-center justify-center transition-colors hover:opacity-100 relative"
            style={{ color: cloudUserEmail ? c.accent : c.activityBarInactiveFg }}
          >
            <CircleUserRound size={22} strokeWidth={1.6} />
          </button>
          {accountMenuOpen && (
            <div
              className="absolute left-[48px] bottom-2 w-60 py-1.5 rounded-[6px] shadow-2xl z-50 text-[12px]"
              style={{
                backgroundColor: c.dropdownBg,
                border: `1px solid ${c.dropdownBorder}`,
                color: c.sidebarFg,
              }}
            >
              <div className="px-3 py-1.5 border-b" style={{ borderColor: c.dropdownBorder }}>
                <div className="font-medium truncate">
                  {cloudUserEmail || 'Not Signed In'}
                </div>
                <div className="text-[11px] opacity-65">
                  {cloudUserEmail ? 'Supabase Cloud Sync Active' : 'Sign in to sync across devices'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onOpenCloudSync();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-white/10"
              >
                {cloudUserEmail ? 'Cloud Sync & Account...' : 'Sign in with Supabase...'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-white/10"
              >
                Manage Workspace Settings
              </button>
            </div>
          )}
        </div>

        <div className="relative w-full" ref={manageRef}>
          <button
            type="button"
            onClick={() => {
              setManageMenuOpen((v) => !v);
              setAccountMenuOpen(false);
            }}
            title="Manage"
            aria-label="Manage"
            className="w-full h-[46px] flex items-center justify-center transition-colors hover:opacity-100"
            style={{ color: c.activityBarInactiveFg }}
          >
            <Settings size={22} strokeWidth={1.6} />
          </button>
          {manageMenuOpen && (
            <div
              className="absolute left-[48px] bottom-1 w-56 py-1.5 rounded-[6px] shadow-2xl z-50 text-[12px]"
              style={{
                backgroundColor: c.dropdownBg,
                border: `1px solid ${c.dropdownBorder}`,
                color: c.sidebarFg,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setManageMenuOpen(false);
                  onOpenCommandPalette();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10"
              >
                <span>Command Palette...</span>
                <span className="text-[11px] opacity-60 font-mono">F1</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManageMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10"
              >
                <span>Settings</span>
                <span className="text-[11px] opacity-60 font-mono">Ctrl+,</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManageMenuOpen(false);
                  onOpenThemes();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10"
              >
                <span>Themes: Color Theme</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
