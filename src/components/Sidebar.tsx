import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  ActivityView,
  EditorTab,
  ExtensionItem,
  FSNode,
  GitCommit,
  ThemeConfig,
} from '../types/ide';
import { ExplorerView } from './sidebar/ExplorerView';
import { SearchView } from './sidebar/SearchView';
import { GitChangeItem, SourceControlView } from './sidebar/SourceControlView';
import { RunDebugView } from './sidebar/RunDebugView';
import { ExtensionsView } from './sidebar/ExtensionsView';

interface SidebarProps {
  theme: ThemeConfig;
  width: number;
  activeView: ActivityView;
  workspaceName: string;
  nodes: FSNode[];
  activeFileId?: string;
  openTabs: EditorTab[];
  dirtyFileIds: Set<string>;
  modifiedFileIds: Set<string>;
  untrackedFileIds: Set<string>;
  gitBranch: string;
  gitChanges: GitChangeItem[];
  stagedIds: Set<string>;
  commits: GitCommit[];
  breakpoints: Record<string, number[]>;
  extensions: ExtensionItem[];
  inlineCreate: { parentId: string | null; type: 'file' | 'folder' } | null;
  onSetInlineCreate: (val: { parentId: string | null; type: 'file' | 'folder' } | null) => void;
  onSelectFile: (fileId: string, line?: number) => void;
  onCloseTab: (tabId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCollapseAllFolders: () => void;
  onCreateNode: (parentId: string | null, type: 'file' | 'folder', name: string) => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateFile: (fileId: string) => void;
  onDownloadFile: (fileId: string) => void;
  onMoveNode: (nodeId: string, targetFolderId: string | null) => void;
  onOpenLocalFolder: () => void;
  onReplaceAllInWorkspace: (query: string, replacement: string, matchCase: boolean) => number;
  onToggleStage: (fileId: string) => void;
  onStageAll: () => void;
  onDiscardChange: (fileId: string) => void;
  onCommit: (message: string) => void;
  onOpenDiff: (fileId: string) => void;
  onRunActiveFile: () => void;
  onOpenPreview: () => void;
  onRemoveBreakpoint: (fileId: string, line: number) => void;
  onToggleInstallExtension: (id: string) => void;
  onToggleEnableExtension: (id: string) => void;
  onOpenCommandPalette: () => void;
}

const VIEW_TITLES: Record<ActivityView, string> = {
  explorer: 'EXPLORER',
  search: 'SEARCH',
  git: 'SOURCE CONTROL',
  debug: 'RUN AND DEBUG',
  extensions: 'EXTENSIONS',
};

export const Sidebar: React.FC<SidebarProps> = ({
  theme,
  width,
  activeView,
  workspaceName,
  nodes,
  activeFileId,
  openTabs,
  dirtyFileIds,
  modifiedFileIds,
  untrackedFileIds,
  gitBranch,
  gitChanges,
  stagedIds,
  commits,
  breakpoints,
  extensions,
  inlineCreate,
  onSetInlineCreate,
  onSelectFile,
  onCloseTab,
  onToggleFolder,
  onCollapseAllFolders,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
  onDuplicateFile,
  onDownloadFile,
  onMoveNode,
  onOpenLocalFolder,
  onReplaceAllInWorkspace,
  onToggleStage,
  onStageAll,
  onDiscardChange,
  onCommit,
  onOpenDiff,
  onRunActiveFile,
  onOpenPreview,
  onRemoveBreakpoint,
  onToggleInstallExtension,
  onToggleEnableExtension,
  onOpenCommandPalette,
}) => {
  const c = theme.colors;
  const activeFile = nodes.find((n) => n.id === activeFileId);

  return (
    <aside
      style={{
        width: `${width}px`,
        backgroundColor: c.sidebarBg,
        color: c.sidebarFg,
        borderRight: `1px solid ${c.sidebarBorder}`,
      }}
      className="h-full flex flex-col shrink-0 overflow-hidden"
      aria-label="Primary Side Bar"
    >
      {/* Sidebar Header */}
      <div className="h-[35px] px-4 flex items-center justify-between text-[11px] font-medium tracking-wider shrink-0 select-none">
        <span>{VIEW_TITLES[activeView]}</span>
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="p-1 rounded hover:bg-white/10 opacity-70 hover:opacity-100"
          title="Views and More Actions..."
          aria-label="More Actions"
        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      {/* View Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeView === 'explorer' && (
          <ExplorerView
            theme={theme}
            workspaceName={workspaceName}
            nodes={nodes}
            activeFileId={activeFileId}
            openTabs={openTabs}
            dirtyFileIds={dirtyFileIds}
            modifiedFileIds={modifiedFileIds}
            untrackedFileIds={untrackedFileIds}
            commits={commits}
            onSelectFile={onSelectFile}
            onCloseTab={onCloseTab}
            onToggleFolder={onToggleFolder}
            onCollapseAllFolders={onCollapseAllFolders}
            onCreateNode={onCreateNode}
            onRenameNode={onRenameNode}
            onDeleteNode={onDeleteNode}
            onDuplicateFile={onDuplicateFile}
            onDownloadFile={onDownloadFile}
            onMoveNode={onMoveNode}
            onOpenLocalFolder={onOpenLocalFolder}
            inlineCreate={inlineCreate}
            onSetInlineCreate={onSetInlineCreate}
          />
        )}

        {activeView === 'search' && (
          <SearchView
            theme={theme}
            nodes={nodes}
            onSelectMatch={onSelectFile}
            onReplaceAllInWorkspace={onReplaceAllInWorkspace}
          />
        )}

        {activeView === 'git' && (
          <SourceControlView
            theme={theme}
            branch={gitBranch}
            changes={gitChanges}
            stagedIds={stagedIds}
            commits={commits}
            nodes={nodes}
            onToggleStage={onToggleStage}
            onStageAll={onStageAll}
            onDiscardChange={onDiscardChange}
            onCommit={onCommit}
            onOpenDiff={onOpenDiff}
          />
        )}

        {activeView === 'debug' && (
          <RunDebugView
            theme={theme}
            activeFile={activeFile}
            nodes={nodes}
            breakpoints={breakpoints}
            onRunActiveFile={onRunActiveFile}
            onOpenPreview={onOpenPreview}
            onRemoveBreakpoint={onRemoveBreakpoint}
            onJumpToLine={onSelectFile}
          />
        )}

        {activeView === 'extensions' && (
          <ExtensionsView
            theme={theme}
            extensions={extensions}
            onToggleInstall={onToggleInstallExtension}
            onToggleEnable={onToggleEnableExtension}
          />
        )}
      </div>
    </aside>
  );
};
