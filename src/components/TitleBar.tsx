import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  PanelLeft,
  PanelBottom,
  Columns2,
  Sun,
  Moon,
  ArrowLeft,
  ArrowRight,
  Cloud,
} from 'lucide-react';
import { ThemeConfig } from '../types/ide';

interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

interface TitleBarProps {
  theme: ThemeConfig;
  workspaceName: string;
  activeFileTitle?: string;
  sidebarVisible: boolean;
  panelVisible: boolean;
  splitActive: boolean;
  cloudUserEmail?: string | null;
  onToggleSidebar: () => void;
  onTogglePanel: () => void;
  onToggleSplit: () => void;
  onOpenCommandPalette: (initialPrefix?: string) => void;
  onToggleThemeQuick: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onOpenLocalFolder: () => void;
  onOpenCloudSync: () => void;
  onSaveFile: () => void;
  onSaveAll: () => void;
  onDownloadFile: () => void;
  onCloseTab: () => void;
  onFormatDocument: () => void;
  onOpenFind: () => void;
  onOpenSettings: () => void;
  onOpenWelcome: () => void;
  onRunActiveFile: () => void;
  onNewTerminal: () => void;
  onNavigateHistory: (dir: 'back' | 'forward') => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  theme,
  workspaceName,
  sidebarVisible,
  panelVisible,
  splitActive,
  cloudUserEmail,
  onToggleSidebar,
  onTogglePanel,
  onToggleSplit,
  onOpenCommandPalette,
  onToggleThemeQuick,
  onNewFile,
  onNewFolder,
  onOpenLocalFolder,
  onOpenCloudSync,
  onSaveFile,
  onSaveAll,
  onDownloadFile,
  onCloseTab,
  onFormatDocument,
  onOpenFind,
  onOpenSettings,
  onOpenWelcome,
  onRunActiveFile,
  onNewTerminal,
  onNavigateHistory,
  canGoBack,
  canGoForward,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: 'New Text File', shortcut: 'Ctrl+N', action: onNewFile },
      { label: 'New Folder...', action: onNewFolder },
      { label: 'Open Local Folder...', action: onOpenLocalFolder },
      { separator: true },
      { label: 'Save', shortcut: 'Ctrl+S', action: onSaveFile },
      { label: 'Save All', shortcut: 'Ctrl+K S', action: onSaveAll },
      { label: 'Download File...', action: onDownloadFile },
      { label: 'Supabase Cloud Sync...', action: onOpenCloudSync },
      { separator: true },
      { label: 'Preferences: Settings', shortcut: 'Ctrl+,', action: onOpenSettings },
      { label: 'Color Theme...', action: () => onOpenCommandPalette('>Preferences: Color Theme') },
      { separator: true },
      { label: 'Close Editor', shortcut: 'Ctrl+W', action: onCloseTab },
    ],
    Edit: [
      { label: 'Find', shortcut: 'Ctrl+F', action: onOpenFind },
      { label: 'Replace in Files', shortcut: 'Ctrl+Shift+H', action: () => onOpenCommandPalette('>View: Show Search') },
      { separator: true },
      { label: 'Format Document', shortcut: 'Shift+Alt+F', action: onFormatDocument },
    ],
    Selection: [
      { label: 'Select All', shortcut: 'Ctrl+A', action: () => document.execCommand('selectAll') },
      { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => onOpenCommandPalette('>') },
    ],
    View: [
      { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => onOpenCommandPalette('>') },
      { label: 'Open View...', action: () => onOpenCommandPalette('>') },
      { separator: true },
      { label: 'Primary Side Bar', shortcut: 'Ctrl+B', action: onToggleSidebar },
      { label: 'Bottom Panel', shortcut: 'Ctrl+J', action: onTogglePanel },
      { label: 'Split Editor Right', shortcut: 'Ctrl+\\', action: onToggleSplit },
      { separator: true },
      { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => onOpenCommandPalette('>View: Show Explorer') },
      { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => onOpenCommandPalette('>View: Show Search') },
      { label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: () => onOpenCommandPalette('>View: Show Source Control') },
      { label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: () => onOpenCommandPalette('>View: Show Extensions') },
    ],
    Go: [
      { label: 'Back', shortcut: 'Alt+Left', action: () => onNavigateHistory('back'), disabled: !canGoBack },
      { label: 'Forward', shortcut: 'Alt+Right', action: () => onNavigateHistory('forward'), disabled: !canGoForward },
      { separator: true },
      { label: 'Go to File...', shortcut: 'Ctrl+P', action: () => onOpenCommandPalette('') },
      { label: 'Go to Symbol...', shortcut: 'Ctrl+Shift+O', action: () => onOpenCommandPalette('>') },
    ],
    Run: [
      { label: 'Run Active File', shortcut: 'F5', action: onRunActiveFile },
      { label: 'Show Debug Console', action: () => onOpenCommandPalette('>View: Show Debug Console') },
    ],
    Terminal: [
      { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: onNewTerminal },
      { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: onTogglePanel },
    ],
    Help: [
      { label: 'Welcome', action: onOpenWelcome },
      { label: 'Show All Commands', shortcut: 'F1', action: () => onOpenCommandPalette('>') },
      { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', action: onOpenSettings },
    ],
  };

  const c = theme.colors;

  return (
    <header
      className="h-[35px] w-full flex items-center justify-between px-2.5 text-[12px] select-none shrink-0 relative z-40"
      style={{
        backgroundColor: c.titleBarBg,
        color: c.titleBarFg,
        borderBottom: `1px solid ${c.titleBarBorder}`,
      }}
    >
      {/* Left: VS Code Icon + Menu Bar */}
      <div className="flex items-center gap-1 min-w-0" ref={menuRef}>
        <button
          type="button"
          onClick={onOpenWelcome}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 shrink-0 mr-1"
          title="Visual Studio Code"
          aria-label="Visual Studio Code Home"
        >
          <svg width="18" height="18" viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <path d="M94.5 14.5L74.5 4.8C72.2 3.7 69.4 4.1 67.6 5.9L30.2 39.9L14.2 27.8C12.3 26.4 9.7 26.5 8 28.1L2.2 33.4C0.1 35.3 0.1 38.6 2.2 40.5L16.9 50L2.2 59.5C0.1 61.4 0.1 64.7 2.2 66.6L8 71.9C9.7 73.5 12.3 73.6 14.2 72.2L30.2 60.1L67.6 94.1C69.4 95.9 72.2 96.3 74.5 95.2L94.5 85.5C97.2 84.2 99 81.4 99 78.4V21.6C99 18.6 97.2 15.8 94.5 14.5ZM74 71.7L44.8 50L74 28.3V71.7Z" fill="#007ACC" />
          </svg>
        </button>

        <nav className="hidden md:flex items-center gap-0.5" aria-label="Application menu">
          {Object.keys(menus).map((menuName) => {
            const isOpen = openMenu === menuName;
            return (
              <div key={menuName} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(isOpen ? null : menuName)}
                  onMouseEnter={() => {
                    if (openMenu && openMenu !== menuName) setOpenMenu(menuName);
                  }}
                  className="px-2 py-1 rounded-[4px] transition-colors whitespace-nowrap shrink-0 text-[12px]"
                  style={{
                    backgroundColor: isOpen ? c.listHoverBg : 'transparent',
                  }}
                >
                  {menuName}
                </button>
                {isOpen && (
                  <div
                    className="absolute left-0 top-full mt-0.5 w-64 py-1.5 rounded-[6px] shadow-2xl z-50"
                    style={{
                      backgroundColor: c.dropdownBg,
                      border: `1px solid ${c.dropdownBorder}`,
                      color: c.sidebarFg,
                    }}
                  >
                    {menus[menuName].map((item, idx) =>
                      item.separator ? (
                        <div
                          key={`sep-${idx}`}
                          className="my-1 h-[1px] mx-2"
                          style={{ backgroundColor: c.dropdownBorder }}
                        />
                      ) : (
                        <button
                          key={item.label}
                          type="button"
                          disabled={item.disabled}
                          onClick={() => {
                            setOpenMenu(null);
                            item.action?.();
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center justify-between text-[12px] hover:opacity-100 disabled:opacity-40 transition-colors"
                          style={{
                            color: c.sidebarFg,
                          }}
                          onMouseEnter={(e) => {
                            if (!item.disabled) {
                              e.currentTarget.style.backgroundColor = c.listActiveBg;
                              e.currentTarget.style.color = c.listActiveFg;
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = c.sidebarFg;
                          }}
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <span className="text-[11px] opacity-65 font-mono">{item.shortcut}</span>
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Center: Navigation Arrows + Command Center */}
      <div className="flex items-center gap-1.5 flex-1 max-w-[520px] mx-3 justify-center">
        <div className="hidden sm:flex items-center gap-0.5">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => onNavigateHistory('back')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 disabled:opacity-30"
            title="Go Back (Alt+Left)"
            aria-label="Go Back"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            type="button"
            disabled={!canGoForward}
            onClick={() => onNavigateHistory('forward')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 disabled:opacity-30"
            title="Go Forward (Alt+Right)"
            aria-label="Go Forward"
          >
            <ArrowRight size={14} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenCommandPalette('')}
          className="flex items-center justify-center gap-2 h-[24px] flex-1 max-w-[400px] px-3 rounded-[6px] text-[12px] transition-colors truncate"
          style={{
            backgroundColor: c.inputBg,
            border: `1px solid ${c.inputBorder}`,
            color: c.titleBarFg,
          }}
          title="Search files by name (Ctrl+P) or type > for commands"
        >
          <Search size={12} className="opacity-70 shrink-0" />
          <span className="truncate opacity-85">{workspaceName}</span>
        </button>
      </div>

      {/* Right: Layout Toggles, Cloud Sync & Theme Switch */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onOpenCloudSync}
          className="h-7 px-2 flex items-center gap-1.5 rounded hover:bg-white/10 transition-colors text-[11px]"
          style={{
            color: cloudUserEmail ? '#4ade80' : c.titleBarFg,
          }}
          title={cloudUserEmail ? `Supabase Synced: ${cloudUserEmail}` : 'Connect Supabase Cloud Sync'}
          aria-label="Supabase Cloud Sync"
        >
          <Cloud size={14} />
          <span className="hidden lg:inline whitespace-nowrap">
            {cloudUserEmail ? 'Synced' : 'Cloud Sync'}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          style={{
            color: sidebarVisible ? c.titleBarFg : `${c.titleBarFg}66`,
          }}
          title="Toggle Primary Side Bar (Ctrl+B)"
          aria-label="Toggle Primary Side Bar"
        >
          <PanelLeft size={15} />
        </button>
        <button
          type="button"
          onClick={onTogglePanel}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          style={{
            color: panelVisible ? c.titleBarFg : `${c.titleBarFg}66`,
          }}
          title="Toggle Bottom Panel (Ctrl+J)"
          aria-label="Toggle Bottom Panel"
        >
          <PanelBottom size={15} />
        </button>
        <button
          type="button"
          onClick={onToggleSplit}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          style={{
            color: splitActive ? c.accent : c.titleBarFg,
          }}
          title="Split Editor Right (Ctrl+\\)"
          aria-label="Split Editor Right"
        >
          <Columns2 size={15} />
        </button>
        <button
          type="button"
          onClick={onToggleThemeQuick}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          title={`Switch Color Theme (Current: ${theme.name})`}
          aria-label="Toggle Light/Dark Theme"
        >
          {theme.isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
};
