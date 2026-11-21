import React from 'react';
import {
  FilePlus,
  FolderOpen,
  FolderUp,
  Terminal,
  Palette,
  Command,
  Cloud,
} from 'lucide-react';
import { FSNode, ThemeConfig } from '../types/ide';
import { getNodePath } from '../utils/fsHelpers';
import { FileIcon } from './FileIcon';

interface WelcomeTabProps {
  theme: ThemeConfig;
  recentFiles: FSNode[];
  allNodes: FSNode[];
  onNewFile: () => void;
  onOpenLocalFolder: () => void;
  onOpenQuickOpen: () => void;
  onOpenTerminal: () => void;
  onOpenThemes: () => void;
  onOpenCloudSync: () => void;
  onOpenFile: (fileId: string) => void;
}

export const WelcomeTab: React.FC<WelcomeTabProps> = ({
  theme,
  recentFiles,
  allNodes,
  onNewFile,
  onOpenLocalFolder,
  onOpenQuickOpen,
  onOpenTerminal,
  onOpenThemes,
  onOpenCloudSync,
  onOpenFile,
}) => {
  const c = theme.colors;

  return (
    <div
      className="flex-1 h-full overflow-y-auto px-8 py-12 select-none"
      style={{ backgroundColor: c.editorBg, color: c.editorFg }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-[32px] font-light tracking-tight">Visual Studio Code</h1>
          <p className="text-[16px] opacity-65 mt-1">Editing evolved</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left Column: Start & Recent */}
          <div className="space-y-8">
            <section>
              <h2 className="text-[14px] font-medium mb-3">Start</h2>
              <div className="space-y-1.5 text-[13px]">
                <button
                  type="button"
                  onClick={onNewFile}
                  className="flex items-center gap-2.5 py-1 hover:underline text-left"
                  style={{ color: c.accent }}
                >
                  <FilePlus size={16} />
                  <span>New File...</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenLocalFolder}
                  className="flex items-center gap-2.5 py-1 hover:underline text-left"
                  style={{ color: c.accent }}
                >
                  <FolderUp size={16} />
                  <span>Open Local Folder from PC...</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenQuickOpen}
                  className="flex items-center gap-2.5 py-1 hover:underline text-left"
                  style={{ color: c.accent }}
                >
                  <FolderOpen size={16} />
                  <span>Open File (Ctrl+P)...</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenCloudSync}
                  className="flex items-center gap-2.5 py-1 hover:underline text-left"
                  style={{ color: c.accent }}
                >
                  <Cloud size={16} />
                  <span>Supabase Cloud Sync &amp; Accounts...</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenTerminal}
                  className="flex items-center gap-2.5 py-1 hover:underline text-left"
                  style={{ color: c.accent }}
                >
                  <Terminal size={16} />
                  <span>Open Integrated Terminal...</span>
                </button>
              </div>
            </section>

            <section>
              <h2 className="text-[14px] font-medium mb-3">Recent Files</h2>
              <div className="space-y-1.5 text-[13px]">
                {recentFiles.length === 0 ? (
                  <p className="text-[12px] opacity-55">
                    No recent files yet. Create a file or open a folder to begin.
                  </p>
                ) : (
                  recentFiles.slice(0, 6).map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => onOpenFile(file.id)}
                      className="flex items-center gap-2 py-0.5 hover:underline text-left max-w-full"
                    >
                      <FileIcon name={file.name} language={file.language} size={14} />
                      <span style={{ color: c.accent }}>{file.name}</span>
                      <span className="opacity-50 text-[12px] truncate">
                        {getNodePath(allNodes, file.id)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Walkthroughs & Shortcuts */}
          <div className="space-y-6">
            <section>
              <h2 className="text-[14px] font-medium mb-3">Walkthroughs</h2>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={onOpenThemes}
                  className="w-full p-3.5 rounded-[6px] text-left flex items-start gap-3 transition-colors"
                  style={{
                    backgroundColor: c.tabInactiveBg,
                    border: `1px solid ${c.tabBorder}`,
                  }}
                >
                  <Palette size={20} style={{ color: c.accent }} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[13px] font-medium">Choose your Color Theme</div>
                    <div className="text-[12px] opacity-65 mt-0.5">
                      Switch between Dark Modern, Dark+, Light Modern, Monokai, GitHub Dark, and Dracula.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onOpenQuickOpen}
                  className="w-full p-3.5 rounded-[6px] text-left flex items-start gap-3 transition-colors"
                  style={{
                    backgroundColor: c.tabInactiveBg,
                    border: `1px solid ${c.tabBorder}`,
                  }}
                >
                  <Command size={20} style={{ color: c.accent }} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[13px] font-medium">Master the Command Palette</div>
                    <div className="text-[12px] opacity-65 mt-0.5">
                      Press F1 or Ctrl+Shift+P to run any workbench command, or Ctrl+P to jump to files.
                    </div>
                  </div>
                </button>
              </div>
            </section>

            <section>
              <h2 className="text-[14px] font-medium mb-2.5">Keyboard Shortcuts</h2>
              <div className="space-y-2 text-[12px]">
                {[
                  ['Show All Commands', 'Ctrl+Shift+P'],
                  ['Quick Open File', 'Ctrl+P'],
                  ['Toggle Side Bar', 'Ctrl+B'],
                  ['Toggle Terminal / Panel', 'Ctrl+J'],
                  ['Split Editor Right', 'Ctrl+\\'],
                  ['Find in File', 'Ctrl+F'],
                ].map(([label, keys]) => (
                  <div key={label} className="flex items-center justify-between py-0.5">
                    <span className="opacity-75">{label}</span>
                    <kbd
                      className="px-1.5 py-0.5 rounded-[3px] font-mono text-[11px]"
                      style={{
                        backgroundColor: c.inputBg,
                        border: `1px solid ${c.inputBorder}`,
                      }}
                    >
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
