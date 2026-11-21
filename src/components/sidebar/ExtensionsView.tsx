import React, { useState } from 'react';
import { Download, Check, Star } from 'lucide-react';
import { ExtensionItem, ThemeConfig } from '../../types/ide';

interface ExtensionsViewProps {
  theme: ThemeConfig;
  extensions: ExtensionItem[];
  onToggleInstall: (id: string) => void;
  onToggleEnable: (id: string) => void;
}

export const ExtensionsView: React.FC<ExtensionsViewProps> = ({
  theme,
  extensions,
  onToggleInstall,
  onToggleEnable,
}) => {
  const [query, setQuery] = useState('');
  const c = theme.colors;

  const filtered = extensions.filter(
    (ext) =>
      ext.name.toLowerCase().includes(query.toLowerCase()) ||
      ext.publisher.toLowerCase().includes(query.toLowerCase()) ||
      ext.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <div className="p-2.5 border-b" style={{ borderColor: c.sidebarBorder }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Extensions in Marketplace"
          className="w-full h-[26px] px-2 rounded-[2px] text-[12px] outline-none"
          style={{
            backgroundColor: c.inputBg,
            color: c.inputFg,
            border: `1px solid ${c.inputBorder}`,
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((ext) => (
          <div
            key={ext.id}
            className="p-2.5 border-b flex items-start gap-2.5 hover:bg-white/5 transition-colors"
            style={{ borderColor: c.sidebarBorder }}
          >
            <div
              className="w-9 h-9 rounded-[4px] flex items-center justify-center font-bold text-white text-[13px] shrink-0"
              style={{ backgroundColor: ext.iconColor }}
            >
              {ext.shortTag}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[12px] truncate">{ext.name}</span>
                <span className="text-[10px] opacity-55 font-mono shrink-0">v{ext.version}</span>
              </div>
              <p className="text-[11px] opacity-75 line-clamp-2 mt-0.5 leading-snug">
                {ext.description}
              </p>

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] opacity-60 flex items-center gap-2 truncate">
                  <span>{ext.publisher}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 tabular-nums">
                    <Download size={10} />
                    {ext.downloads}
                  </span>
                  <span className="flex items-center gap-0.5 tabular-nums">
                    <Star size={10} className="fill-current text-amber-400" />
                    {ext.rating}
                  </span>
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  {ext.installed ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onToggleEnable(ext.id)}
                        className="px-2 py-0.5 text-[10px] rounded-[2px] font-medium hover:opacity-90"
                        style={{
                          backgroundColor: ext.enabled ? c.listActiveBg : c.inputBg,
                          color: ext.enabled ? c.listActiveFg : c.sidebarFg,
                          border: `1px solid ${c.inputBorder}`,
                        }}
                      >
                        {ext.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleInstall(ext.id)}
                        className="px-2 py-0.5 text-[10px] rounded-[2px] opacity-75 hover:opacity-100"
                        style={{ border: `1px solid ${c.inputBorder}` }}
                      >
                        Uninstall
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleInstall(ext.id)}
                      className="px-2.5 py-0.5 text-[10px] rounded-[2px] font-medium flex items-center gap-1"
                      style={{
                        backgroundColor: c.buttonBg,
                        color: c.buttonFg,
                      }}
                    >
                      <Check size={10} />
                      Install
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
