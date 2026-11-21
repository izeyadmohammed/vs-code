import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { EditorSettings, ThemeConfig, ThemeId } from '../types/ide';
import { THEMES } from '../data/themes';

interface SettingsTabProps {
  theme: ThemeConfig;
  settings: EditorSettings;
  onUpdateSettings: (patch: Partial<EditorSettings>) => void;
  onResetWorkspace: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  theme,
  settings,
  onUpdateSettings,
  onResetWorkspace,
}) => {
  const [search, setSearch] = useState('');
  const c = theme.colors;

  const matches = (text: string) =>
    !search.trim() || text.toLowerCase().includes(search.toLowerCase());

  return (
    <div
      className="flex-1 h-full overflow-y-auto px-8 py-6"
      style={{ backgroundColor: c.editorBg, color: c.editorFg }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-3">
          <h2 className="text-[18px] font-semibold">Settings</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search settings (e.g., theme, font, minimap, wrap)..."
            className="w-full h-[32px] px-3 rounded-[3px] text-[13px] outline-none"
            style={{
              backgroundColor: c.inputBg,
              color: c.inputFg,
              border: `1px solid ${c.inputBorder}`,
            }}
          />
        </div>

        <div className="divide-y" style={{ borderColor: c.tabBorder }}>
          {matches('Color Theme workbench appearance') && (
            <div className="py-4 space-y-1.5">
              <div className="text-[13px] font-semibold">Workbench: Color Theme</div>
              <p className="text-[12px] opacity-70">
                Specifies the color theme used in the workbench and syntax highlighter.
              </p>
              <select
                value={settings.theme}
                onChange={(e) => onUpdateSettings({ theme: e.target.value as ThemeId })}
                className="h-[30px] px-2.5 rounded-[3px] text-[13px] outline-none mt-1"
                style={{
                  backgroundColor: c.inputBg,
                  color: c.inputFg,
                  border: `1px solid ${c.inputBorder}`,
                }}
              >
                {Object.values(THEMES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {matches('Editor: Font Size') && (
            <div className="py-4 space-y-1.5">
              <div className="text-[13px] font-semibold">Editor: Font Size</div>
              <p className="text-[12px] opacity-70">Controls the font size in pixels.</p>
              <input
                type="number"
                min={11}
                max={24}
                value={settings.fontSize}
                onChange={(e) =>
                  onUpdateSettings({ fontSize: Math.max(11, Math.min(24, Number(e.target.value) || 14)) })
                }
                className="w-24 h-[30px] px-2.5 rounded-[3px] text-[13px] outline-none font-mono tabular-nums"
                style={{
                  backgroundColor: c.inputBg,
                  color: c.inputFg,
                  border: `1px solid ${c.inputBorder}`,
                }}
              />
            </div>
          )}

          {matches('Editor: Tab Size') && (
            <div className="py-4 space-y-1.5">
              <div className="text-[13px] font-semibold">Editor: Tab Size</div>
              <p className="text-[12px] opacity-70">The number of spaces a tab is equal to.</p>
              <select
                value={settings.tabSize}
                onChange={(e) => onUpdateSettings({ tabSize: Number(e.target.value) })}
                className="w-24 h-[30px] px-2.5 rounded-[3px] text-[13px] outline-none font-mono tabular-nums"
                style={{
                  backgroundColor: c.inputBg,
                  color: c.inputFg,
                  border: `1px solid ${c.inputBorder}`,
                }}
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
              </select>
            </div>
          )}

          {matches('Editor: Word Wrap') && (
            <label className="py-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.wordWrap}
                onChange={(e) => onUpdateSettings({ wordWrap: e.target.checked })}
                className="mt-1 accent-blue-600"
              />
              <div>
                <div className="text-[13px] font-semibold">Editor: Word Wrap</div>
                <p className="text-[12px] opacity-70">Controls how lines should wrap inside the editor.</p>
              </div>
            </label>
          )}

          {matches('Editor: Minimap') && (
            <label className="py-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.minimap}
                onChange={(e) => onUpdateSettings({ minimap: e.target.checked })}
                className="mt-1 accent-blue-600"
              />
              <div>
                <div className="text-[13px] font-semibold">Editor: Minimap Enabled</div>
                <p className="text-[12px] opacity-70">Controls whether the minimap is shown on the right.</p>
              </div>
            </label>
          )}

          {matches('Editor: Line Numbers') && (
            <label className="py-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.lineNumbers}
                onChange={(e) => onUpdateSettings({ lineNumbers: e.target.checked })}
                className="mt-1 accent-blue-600"
              />
              <div>
                <div className="text-[13px] font-semibold">Editor: Line Numbers</div>
                <p className="text-[12px] opacity-70">Controls the display of line numbers in the gutter.</p>
              </div>
            </label>
          )}

          {matches('Files: Auto Save') && (
            <label className="py-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                className="mt-1 accent-blue-600"
              />
              <div>
                <div className="text-[13px] font-semibold">Files: Auto Save</div>
                <p className="text-[12px] opacity-70">Automatically saves dirty editors after a brief edit.</p>
              </div>
            </label>
          )}

          {matches('Editor: Format On Save') && (
            <label className="py-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.formatOnSave}
                onChange={(e) => onUpdateSettings({ formatOnSave: e.target.checked })}
                className="mt-1 accent-blue-600"
              />
              <div>
                <div className="text-[13px] font-semibold">Editor: Format On Save</div>
                <p className="text-[12px] opacity-70">Format a file automatically when saving with Ctrl+S.</p>
              </div>
            </label>
          )}

          <div className="py-5">
            <div className="text-[13px] font-semibold mb-1">Workspace Storage</div>
            <p className="text-[12px] opacity-70 mb-3">
              Clear all workspace files, commits, and preferences back to a clean empty workbench.
            </p>
            <button
              type="button"
              onClick={onResetWorkspace}
              className="px-3 py-1.5 rounded-[3px] text-[12px] font-medium flex items-center gap-1.5 hover:opacity-90"
              style={{
                backgroundColor: c.inputBg,
                border: `1px solid ${c.inputBorder}`,
              }}
            >
              <RotateCcw size={13} />
              <span>Reset Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
