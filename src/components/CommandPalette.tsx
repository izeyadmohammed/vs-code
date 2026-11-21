import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Palette, FileCode2 } from 'lucide-react';
import { FSNode, ThemeConfig, ThemeId } from '../types/ide';
import { getNodePath } from '../utils/fsHelpers';
import { FileIcon } from './FileIcon';
import { THEMES } from '../data/themes';

export interface CommandItem {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  theme: ThemeConfig;
  isOpen: boolean;
  initialInput: string;
  nodes: FSNode[];
  commands: CommandItem[];
  onClose: () => void;
  onSelectFile: (fileId: string) => void;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  theme,
  isOpen,
  initialInput,
  nodes,
  commands,
  onClose,
  onSelectFile,
  onSelectTheme,
}) => {
  const [input, setInput] = useState(initialInput);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInput(initialInput);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen, initialInput]);

  if (!isOpen) return null;

  const isCommandMode = input.startsWith('>');
  const isThemeSubmode = input.toLowerCase().startsWith('>preferences: color theme');
  const query = isCommandMode ? input.slice(1).trim().toLowerCase() : input.trim().toLowerCase();

  const fileNodes = nodes.filter((n) => n.type === 'file');

  const items: Array<{
    key: string;
    title: string;
    subtitle?: string;
    shortcut?: string;
    icon: React.ReactNode;
    run: () => void;
  }> = isThemeSubmode
    ? Object.values(THEMES).map((t) => ({
        key: t.id,
        title: t.name,
        subtitle: t.isDark ? 'Dark Theme' : 'Light Theme',
        icon: <Palette size={14} style={{ color: theme.colors.accent }} />,
        run: () => {
          onSelectTheme(t.id);
          onClose();
        },
      }))
    : isCommandMode
    ? commands
        .filter((cmd) =>
          `${cmd.category}: ${cmd.label}`.toLowerCase().includes(query)
        )
        .map((cmd) => ({
          key: cmd.id,
          title: `${cmd.category}: ${cmd.label}`,
          shortcut: cmd.shortcut,
          icon: <Terminal size={14} className="opacity-70" />,
          run: () => {
            if (cmd.id === 'theme-picker') {
              setInput('>Preferences: Color Theme');
              setActiveIndex(0);
            } else {
              onClose();
              cmd.action();
            }
          },
        }))
    : fileNodes
        .filter((f) => {
          const p = getNodePath(nodes, f.id).toLowerCase();
          return !query || p.includes(query);
        })
        .map((f) => ({
          key: f.id,
          title: f.name,
          subtitle: getNodePath(nodes, f.id),
          icon: <FileIcon name={f.name} language={f.language} size={15} />,
          run: () => {
            onSelectFile(f.id);
            onClose();
          },
        }));

  const clampedIndex = Math.min(activeIndex, Math.max(0, items.length - 1));
  const c = theme.colors;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[42px] bg-black/25"
      onMouseDown={onClose}
    >
      <div
        className="w-[92vw] max-w-[600px] rounded-[6px] shadow-2xl overflow-hidden"
        style={{
          backgroundColor: c.dropdownBg,
          border: `1px solid ${c.dropdownBorder}`,
          color: c.sidebarFg,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b" style={{ borderColor: c.dropdownBorder }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) =>
                  items.length ? (prev - 1 + items.length) % items.length : 0
                );
              } else if (e.key === 'Enter' && items[clampedIndex]) {
                e.preventDefault();
                items[clampedIndex].run();
              }
            }}
            placeholder="Search files by name (type > for commands)"
            className="w-full h-[30px] px-2.5 rounded-[3px] text-[13px] outline-none"
            style={{
              backgroundColor: c.inputBg,
              color: c.inputFg,
              border: `1px solid ${c.focusBorder}`,
            }}
          />
        </div>

        <div className="max-h-[340px] overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-4 py-3 text-[12px] opacity-60 flex items-center gap-2">
              <FileCode2 size={14} />
              <span>No matching results</span>
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === clampedIndex;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.run}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between text-[13px]"
                  style={{
                    backgroundColor: isSelected ? c.listActiveBg : 'transparent',
                    color: isSelected ? c.listActiveFg : c.sidebarFg,
                  }}
                >
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    {item.icon}
                    <span className="font-medium truncate">{item.title}</span>
                    {item.subtitle && (
                      <span className="text-[11px] opacity-60 truncate">{item.subtitle}</span>
                    )}
                  </span>
                  {item.shortcut && (
                    <span className="text-[11px] opacity-65 font-mono shrink-0 pl-3">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
