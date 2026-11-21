import React, { useState, useRef, useEffect } from 'react';
import {
  GitBranch,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Check,
  Bell,
  Code2,
} from 'lucide-react';
import { FileLanguage, NotificationItem, ThemeConfig } from '../types/ide';
import { getLanguageLabel } from '../data/initialWorkspace';

interface StatusBarProps {
  theme: ThemeConfig;
  branch: string;
  branches: string[];
  errorCount: number;
  warningCount: number;
  cursorLine: number;
  cursorCol: number;
  tabSize: number;
  language?: FileLanguage;
  prettierEnabled: boolean;
  notifications: NotificationItem[];
  onSwitchBranch: (branch: string) => void;
  onOpenProblems: () => void;
  onFormatDocument: () => void;
  onChangeLanguage: (lang: FileLanguage) => void;
  onOpenSettings: () => void;
  onClearNotifications: () => void;
}

const ALL_LANGUAGES: FileLanguage[] = [
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'html',
  'css',
  'json',
  'markdown',
  'python',
  'plaintext',
];

export const StatusBar: React.FC<StatusBarProps> = ({
  theme,
  branch,
  branches,
  errorCount,
  warningCount,
  cursorLine,
  cursorCol,
  tabSize,
  language,
  prettierEnabled,
  notifications,
  onSwitchBranch,
  onOpenProblems,
  onFormatDocument,
  onChangeLanguage,
  onOpenSettings,
  onClearNotifications,
}) => {
  const [branchMenu, setBranchMenu] = useState(false);
  const [langMenu, setLangMenu] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeAll = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setBranchMenu(false);
        setLangMenu(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener('mousedown', closeAll);
    return () => window.removeEventListener('mousedown', closeAll);
  }, []);

  const c = theme.colors;

  return (
    <footer
      ref={containerRef}
      className="h-[22px] w-full flex items-center justify-between text-[11px] select-none shrink-0 relative z-40"
      style={{
        backgroundColor: c.statusBarBg,
        color: c.statusBarFg,
        borderTop: `1px solid ${c.statusBarBorder}`,
      }}
    >
      {/* Left Status Items */}
      <div className="flex items-center h-full">
        {/* Remote indicator */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="h-full px-2.5 flex items-center justify-center hover:bg-white/15 transition-colors"
          style={{ backgroundColor: c.accent, color: '#ffffff' }}
          title="Open Remote / Workbench Settings"
          aria-label="Remote Window"
        >
          <Code2 size={13} />
        </button>

        {/* Git Branch Picker */}
        <div className="relative h-full">
          <button
            type="button"
            onClick={() => {
              setBranchMenu((v) => !v);
              setLangMenu(false);
              setNotifOpen(false);
            }}
            className="h-full px-2 flex items-center gap-1 hover:bg-white/10 transition-colors whitespace-nowrap"
            title="Checkout branch..."
          >
            <GitBranch size={12} />
            <span>{branch}</span>
          </button>
          {branchMenu && (
            <div
              className="absolute left-0 bottom-[22px] w-48 py-1 rounded-[6px] shadow-2xl z-50"
              style={{
                backgroundColor: c.dropdownBg,
                border: `1px solid ${c.dropdownBorder}`,
                color: c.sidebarFg,
              }}
            >
              <div className="px-3 py-1 text-[10px] opacity-60 font-semibold">
                Select Git Branch
              </div>
              {branches.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    onSwitchBranch(b);
                    setBranchMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 text-[12px]"
                >
                  <span className="flex items-center gap-1.5">
                    <GitBranch size={12} />
                    {b}
                  </span>
                  {b === branch && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenProblems}
          className="h-full px-2 flex items-center gap-2 hover:bg-white/10 transition-colors tabular-nums whitespace-nowrap"
          title="Problems (Ctrl+Shift+M)"
        >
          <span className="flex items-center gap-1">
            <XCircle size={12} />
            {errorCount}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle size={12} />
            {warningCount}
          </span>
        </button>
      </div>

      {/* Right Status Items */}
      <div className="flex items-center h-full">
        {language && (
          <>
            <button
              type="button"
              onClick={onOpenSettings}
              className="h-full px-2 hover:bg-white/10 transition-colors tabular-nums whitespace-nowrap hidden sm:flex items-center"
              title="Go to Line/Column"
            >
              Ln {cursorLine}, Col {cursorCol}
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="h-full px-2 hover:bg-white/10 transition-colors tabular-nums whitespace-nowrap hidden md:flex items-center"
              title="Select Indentation"
            >
              Spaces: {tabSize}
            </button>
            <span className="h-full px-2 hidden lg:flex items-center opacity-90 whitespace-nowrap">
              UTF-8
            </span>
            <span className="h-full px-2 hidden lg:flex items-center opacity-90 whitespace-nowrap">
              LF
            </span>

            {/* Language Mode Picker */}
            <div className="relative h-full">
              <button
                type="button"
                onClick={() => {
                  setLangMenu((v) => !v);
                  setBranchMenu(false);
                  setNotifOpen(false);
                }}
                className="h-full px-2 hover:bg-white/10 transition-colors whitespace-nowrap flex items-center"
                title="Select Language Mode"
              >
                {getLanguageLabel(language)}
              </button>
              {langMenu && (
                <div
                  className="absolute right-0 bottom-[22px] w-48 py-1 rounded-[6px] shadow-2xl z-50 max-h-64 overflow-y-auto"
                  style={{
                    backgroundColor: c.dropdownBg,
                    border: `1px solid ${c.dropdownBorder}`,
                    color: c.sidebarFg,
                  }}
                >
                  {ALL_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        onChangeLanguage(lang);
                        setLangMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 text-[12px]"
                    >
                      <span>{getLanguageLabel(lang)}</span>
                      {lang === language && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {prettierEnabled && language && (
          <button
            type="button"
            onClick={onFormatDocument}
            className="h-full px-2 hover:bg-white/10 transition-colors flex items-center gap-1 whitespace-nowrap"
            title="Format Document with Prettier (Shift+Alt+F)"
          >
            <Check size={11} />
            <span>Prettier</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setNotifOpen((v) => !v);
            setBranchMenu(false);
            setLangMenu(false);
          }}
          className="h-full px-2 hover:bg-white/10 transition-colors flex items-center gap-1 relative"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={12} />
          {notifications.length > 0 && (
            <span className="tabular-nums text-[10px]">{notifications.length}</span>
          )}
        </button>

        {notifOpen && (
          <div
            className="absolute right-2 bottom-[26px] w-80 rounded-[6px] shadow-2xl z-50 overflow-hidden"
            style={{
              backgroundColor: c.dropdownBg,
              border: `1px solid ${c.dropdownBorder}`,
              color: c.sidebarFg,
            }}
          >
            <div
              className="px-3 py-2 flex items-center justify-between border-b text-[11px] font-semibold"
              style={{ borderColor: c.dropdownBorder }}
            >
              <span>Notifications</span>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearNotifications}
                  className="text-[11px] opacity-75 hover:opacity-100 underline"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-3 py-4 text-[12px] opacity-65 text-center">
                  No new notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="px-3 py-2 border-b text-[12px]"
                    style={{ borderColor: c.dropdownBorder }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-[11px] opacity-75">{n.source}</span>
                      <RefreshCw size={10} className="opacity-40" />
                    </div>
                    <div>{n.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
