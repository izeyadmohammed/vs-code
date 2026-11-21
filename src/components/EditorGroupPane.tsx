import React from 'react';
import {
  X,
  ChevronRight,
  Eye,
  Columns2,
  Play,
  Sparkles,
  FileCode2,
} from 'lucide-react';
import {
  EditorSettings,
  EditorTab,
  FSNode,
  ThemeConfig,
} from '../types/ide';
import { FileIcon } from './FileIcon';
import { getNodeBreadcrumbParts, getNodePath } from '../utils/fsHelpers';
import { CodeEditor } from './CodeEditor';
import { WelcomeTab } from './WelcomeTab';
import { SettingsTab } from './SettingsTab';
import { DiffViewer } from './DiffViewer';
import { LivePreviewPane } from './LivePreviewPane';

interface EditorGroupPaneProps {
  groupId: 'primary' | 'secondary';
  theme: ThemeConfig;
  settings: EditorSettings;
  tabs: EditorTab[];
  activeTabId: string | null;
  nodes: FSNode[];
  dirtyFileIds: Set<string>;
  committedSnapshot: Record<string, string>;
  breakpoints: Record<string, number[]>;
  jumpToLine: { fileId: string; line: number; nonce: number } | null;
  findTriggerNonce: number;
  isFocused: boolean;
  onFocusGroup: () => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onReorderTabs: (draggedTabId: string, targetTabId: string) => void;
  onChangeContent: (fileId: string, content: string) => void;
  onSaveFile: (fileId: string) => void;
  onCursorChange: (line: number, col: number) => void;
  onToggleBreakpoint: (fileId: string, line: number) => void;
  onUpdateSettings: (patch: Partial<EditorSettings>) => void;
  onResetWorkspace: () => void;
  onOpenFile: (fileId: string, line?: number) => void;
  onNewFile: () => void;
  onOpenLocalFolder: () => void;
  onOpenQuickOpen: () => void;
  onOpenTerminal: () => void;
  onOpenThemes: () => void;
  onOpenCloudSync: () => void;
  onRunActiveFile: (fileId?: string) => void;
  onOpenPreview: (fileId: string) => void;
  onSplitEditor: () => void;
  onFormatDocument: (fileId: string) => void;
}

export const EditorGroupPane: React.FC<EditorGroupPaneProps> = ({
  groupId,
  theme,
  settings,
  tabs,
  activeTabId,
  nodes,
  dirtyFileIds,
  committedSnapshot,
  breakpoints,
  jumpToLine,
  findTriggerNonce,
  isFocused,
  onFocusGroup,
  onSelectTab,
  onCloseTab,
  onReorderTabs,
  onChangeContent,
  onSaveFile,
  onCursorChange,
  onToggleBreakpoint,
  onUpdateSettings,
  onResetWorkspace,
  onOpenFile,
  onNewFile,
  onOpenLocalFolder,
  onOpenQuickOpen,
  onOpenTerminal,
  onOpenThemes,
  onOpenCloudSync,
  onRunActiveFile,
  onOpenPreview,
  onSplitEditor,
  onFormatDocument,
}) => {
  const c = theme.colors;
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || null;
  const activeFile =
    activeTab?.fileId ? nodes.find((n) => n.id === activeTab.fileId) : undefined;
  const activeFilePath = activeFile ? getNodePath(nodes, activeFile.id) : '';

  const recentFiles = nodes.filter((n) => n.type === 'file');
  const breadcrumbs = activeFile ? getNodeBreadcrumbParts(nodes, activeFile.id) : [];

  const canPreview =
    activeTab?.kind === 'file' &&
    activeFile &&
    (activeFile.language === 'html' || activeFile.language === 'markdown');

  const canRun =
    activeTab?.kind === 'file' &&
    activeFile &&
    (activeFile.language === 'javascript' || activeFile.language === 'typescript');

  return (
    <div
      onMouseDown={onFocusGroup}
      className="flex-1 min-w-0 h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: c.editorBg }}
    >
      {/* Editor Tabs Bar */}
      <div
        className="h-[35px] w-full flex items-center justify-between overflow-hidden shrink-0 select-none"
        style={{
          backgroundColor: c.tabBarBg,
          borderBottom: `1px solid ${c.tabBorder}`,
        }}
      >
        <div className="flex items-center h-full overflow-x-auto no-scrollbar min-w-0">
          {tabs.map((tab) => {
            const isActive = activeTab?.id === tab.id;
            const fileNode = tab.fileId ? nodes.find((n) => n.id === tab.fileId) : undefined;
            const isDirty = tab.kind === 'file' && tab.fileId ? dirtyFileIds.has(tab.fileId) : false;

            return (
              <div
                key={tab.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/tab-id', tab.id);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = e.dataTransfer.getData('text/tab-id');
                  if (draggedId && draggedId !== tab.id) {
                    onReorderTabs(draggedId, tab.id);
                  }
                }}
                onClick={() => onSelectTab(tab.id)}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    onCloseTab(tab.id);
                  }
                }}
                className="relative h-full px-3 flex items-center gap-2 text-[12.5px] cursor-pointer group shrink-0 border-r"
                style={{
                  backgroundColor: isActive ? c.tabActiveBg : c.tabInactiveBg,
                  color: isActive ? c.tabActiveFg : c.tabInactiveFg,
                  borderRightColor: c.tabBorder,
                }}
              >
                {isActive && isFocused && (
                  <span
                    className="absolute top-0 left-0 right-0 h-[1.5px]"
                    style={{ backgroundColor: c.tabActiveBorderTop }}
                  />
                )}
                {fileNode ? (
                  <FileIcon name={fileNode.name} language={fileNode.language} size={14} />
                ) : (
                  <FileCode2 size={14} style={{ color: c.accent }} />
                )}
                <span className="whitespace-nowrap">{tab.title}</span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/15 ml-0.5"
                  aria-label={`Close ${tab.title}`}
                >
                  {isDirty ? (
                    <>
                      <span className="group-hover:hidden text-[10px]">●</span>
                      <X size={12} className="hidden group-hover:block" />
                    </>
                  ) : (
                    <X
                      size={12}
                      className={isActive ? 'opacity-80' : 'opacity-0 group-hover:opacity-80'}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Editor Actions */}
        <div className="flex items-center gap-0.5 px-2 shrink-0" style={{ color: c.tabActiveFg }}>
          {canRun && activeFile && (
            <button
              type="button"
              onClick={() => onRunActiveFile(activeFile.id)}
              className="p-1.5 rounded hover:bg-white/10"
              title="Run Active File"
              aria-label="Run Active File"
            >
              <Play size={14} />
            </button>
          )}
          {canPreview && activeFile && (
            <button
              type="button"
              onClick={() => onOpenPreview(activeFile.id)}
              className="p-1.5 rounded hover:bg-white/10"
              title="Open Preview to the Side"
              aria-label="Open Live Preview"
            >
              <Eye size={14} />
            </button>
          )}
          {activeTab?.kind === 'file' && activeFile && (
            <button
              type="button"
              onClick={() => onFormatDocument(activeFile.id)}
              className="p-1.5 rounded hover:bg-white/10"
              title="Format Document (Shift+Alt+F)"
              aria-label="Format Document"
            >
              <Sparkles size={13} />
            </button>
          )}
          {groupId === 'primary' && (
            <button
              type="button"
              onClick={onSplitEditor}
              className="p-1.5 rounded hover:bg-white/10"
              title="Split Editor Right (Ctrl+\\)"
              aria-label="Split Editor Right"
            >
              <Columns2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumbs Bar */}
      {activeFile && activeTab?.kind === 'file' && (
        <div
          className="h-[22px] px-4 flex items-center gap-1 text-[12px] shrink-0 select-none overflow-hidden"
          style={{
            backgroundColor: c.editorBg,
            color: c.tabInactiveFg,
          }}
        >
          {breadcrumbs.map((part, idx) => (
            <React.Fragment key={part.id}>
              {idx > 0 && <ChevronRight size={12} className="opacity-60 shrink-0" />}
              <span className="flex items-center gap-1 truncate">
                {part.type === 'file' && (
                  <FileIcon name={part.name} language={activeFile.language} size={12} />
                )}
                <span className={idx === breadcrumbs.length - 1 ? 'opacity-100' : 'opacity-80'}>
                  {part.name}
                </span>
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {!activeTab ? (
          <div
            className="flex-1 flex flex-col items-center justify-center select-none opacity-45 space-y-4"
            style={{ color: c.editorFg }}
          >
            <svg width="88" height="88" viewBox="0 0 100 100" fill="none" aria-hidden="true">
              <path
                d="M94.5 14.5L74.5 4.8C72.2 3.7 69.4 4.1 67.6 5.9L30.2 39.9L14.2 27.8C12.3 26.4 9.7 26.5 8 28.1L2.2 33.4C0.1 35.3 0.1 38.6 2.2 40.5L16.9 50L2.2 59.5C0.1 61.4 0.1 64.7 2.2 66.6L8 71.9C9.7 73.5 12.3 73.6 14.2 72.2L30.2 60.1L67.6 94.1C69.4 95.9 72.2 96.3 74.5 95.2L94.5 85.5C97.2 84.2 99 81.4 99 78.4V21.6C99 18.6 97.2 15.8 94.5 14.5ZM74 71.7L44.8 50L74 28.3V71.7Z"
                fill="currentColor"
                opacity="0.25"
              />
            </svg>
            <div className="text-[12px] space-y-1 text-center">
              <div>Show All Commands · Ctrl+Shift+P</div>
              <div>Go to File · Ctrl+P</div>
              <div>Toggle Terminal · Ctrl+`</div>
            </div>
          </div>
        ) : activeTab.kind === 'welcome' ? (
          <WelcomeTab
            theme={theme}
            recentFiles={recentFiles}
            allNodes={nodes}
            onNewFile={onNewFile}
            onOpenLocalFolder={onOpenLocalFolder}
            onOpenQuickOpen={onOpenQuickOpen}
            onOpenTerminal={onOpenTerminal}
            onOpenThemes={onOpenThemes}
            onOpenCloudSync={onOpenCloudSync}
            onOpenFile={(fid) => onOpenFile(fid)}
            onRunPlayground={() => onRunActiveFile('file-demo-js')}
          />
        ) : activeTab.kind === 'settings' ? (
          <SettingsTab
            theme={theme}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onResetWorkspace={onResetWorkspace}
          />
        ) : activeTab.kind === 'diff' && activeFile ? (
          <DiffViewer
            theme={theme}
            fileName={activeFile.name}
            language={activeFile.language || 'plaintext'}
            originalContent={committedSnapshot[activeFile.id] ?? ''}
            modifiedContent={activeFile.content ?? ''}
          />
        ) : activeTab.kind === 'preview' && activeFile ? (
          <LivePreviewPane theme={theme} file={activeFile} />
        ) : activeFile ? (
          <CodeEditor
            fileId={activeFile.id}
            filePath={activeFilePath}
            content={activeFile.content ?? ''}
            language={activeFile.language || 'plaintext'}
            theme={theme}
            settings={settings}
            breakpoints={breakpoints[activeFile.id] || []}
            jumpToLine={
              jumpToLine && jumpToLine.fileId === activeFile.id ? jumpToLine : null
            }
            findTriggerNonce={isFocused ? findTriggerNonce : 0}
            onChange={(val) => onChangeContent(activeFile.id, val)}
            onSave={() => onSaveFile(activeFile.id)}
            onCursorChange={onCursorChange}
            onToggleBreakpoint={(ln) => onToggleBreakpoint(activeFile.id, ln)}
          />
        ) : null}
      </div>
    </div>
  );
};
