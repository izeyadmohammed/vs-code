import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  ChevronsDownUp,
  X,
  Trash2,
  Pencil,
  Copy,
  Braces,
  FolderUp,
  History,
} from 'lucide-react';
import { EditorTab, FSNode, GitCommit, ThemeConfig } from '../../types/ide';
import { FileIcon } from '../FileIcon';
import { extractOutlineSymbols, getNodePath } from '../../utils/fsHelpers';

interface ExplorerViewProps {
  theme: ThemeConfig;
  workspaceName: string;
  nodes: FSNode[];
  activeFileId?: string;
  openTabs: EditorTab[];
  dirtyFileIds: Set<string>;
  modifiedFileIds: Set<string>;
  untrackedFileIds: Set<string>;
  commits: GitCommit[];
  onSelectFile: (fileId: string, line?: number) => void;
  onCloseTab: (tabId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCollapseAllFolders: () => void;
  onCreateNode: (parentId: string | null, type: 'file' | 'folder', name: string) => void;
  onRenameNode: (nodeId: string, newName: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateFile: (fileId: string) => void;
  onMoveNode: (nodeId: string, targetFolderId: string | null) => void;
  onOpenLocalFolder: () => void;
  inlineCreate: { parentId: string | null; type: 'file' | 'folder' } | null;
  onSetInlineCreate: (val: { parentId: string | null; type: 'file' | 'folder' } | null) => void;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  theme,
  workspaceName,
  nodes,
  activeFileId,
  openTabs,
  dirtyFileIds,
  modifiedFileIds,
  untrackedFileIds,
  commits,
  onSelectFile,
  onCloseTab,
  onToggleFolder,
  onCollapseAllFolders,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
  onDuplicateFile,
  onMoveNode,
  onOpenLocalFolder,
  inlineCreate,
  onSetInlineCreate,
}) => {
  const [openEditorsExpanded, setOpenEditorsExpanded] = useState(true);
  const [filesExpanded, setFilesExpanded] = useState(true);
  const [outlineExpanded, setOutlineExpanded] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null | undefined>(undefined);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FSNode;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inlineCreate || renamingId) {
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [inlineCreate, renamingId]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('mousedown', closeMenu);
    return () => window.removeEventListener('mousedown', closeMenu);
  }, []);

  const activeFile = nodes.find((n) => n.id === activeFileId);
  const outlineSymbols = activeFile?.content
    ? extractOutlineSymbols(activeFile.content, activeFile.language)
    : [];

  const c = theme.colors;

  const commitInlineCreate = () => {
    const trimmed = inputValue.trim();
    if (trimmed && inlineCreate) {
      onCreateNode(inlineCreate.parentId, inlineCreate.type, trimmed);
    }
    setInputValue('');
    onSetInlineCreate(null);
  };

  const commitRename = () => {
    const trimmed = inputValue.trim();
    if (trimmed && renamingId) {
      onRenameNode(renamingId, trimmed);
    }
    setInputValue('');
    setRenamingId(null);
  };

  const renderTree = (parentId: string | null, depth: number) => {
    const children = nodes
      .filter((n) => n.parentId === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return (
      <>
        {inlineCreate && inlineCreate.parentId === parentId && (
          <div
            className="flex items-center gap-1.5 h-[22px] pr-2"
            style={{ paddingLeft: `${depth * 14 + 12}px` }}
          >
            <FileIcon
              name={inputValue || (inlineCreate.type === 'folder' ? 'folder' : 'file.ts')}
              isFolder={inlineCreate.type === 'folder'}
              size={14}
            />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitInlineCreate();
                if (e.key === 'Escape') {
                  setInputValue('');
                  onSetInlineCreate(null);
                }
              }}
              onBlur={commitInlineCreate}
              placeholder={inlineCreate.type === 'folder' ? 'Folder name...' : 'File name...'}
              className="flex-1 h-[20px] px-1.5 text-[12px] outline-none rounded-[2px]"
              style={{
                backgroundColor: c.inputBg,
                color: c.inputFg,
                border: `1px solid ${c.focusBorder}`,
              }}
            />
          </div>
        )}

        {children.map((node) => {
          const isFolder = node.type === 'folder';
          const isSelected = isFolder
            ? selectedFolderId === node.id
            : activeFileId === node.id;
          const isDirty = dirtyFileIds.has(node.id);
          const isModified = modifiedFileIds.has(node.id);
          const isUntracked = untrackedFileIds.has(node.id);

          if (renamingId === node.id) {
            return (
              <div
                key={node.id}
                className="flex items-center gap-1.5 h-[22px] pr-2"
                style={{ paddingLeft: `${depth * 14 + 12}px` }}
              >
                <FileIcon name={node.name} isFolder={isFolder} isOpen={node.isOpen} size={14} />
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') {
                      setInputValue('');
                      setRenamingId(null);
                    }
                  }}
                  onBlur={commitRename}
                  className="flex-1 h-[20px] px-1.5 text-[12px] outline-none rounded-[2px]"
                  style={{
                    backgroundColor: c.inputBg,
                    color: c.inputFg,
                    border: `1px solid ${c.focusBorder}`,
                  }}
                />
              </div>
            );
          }

          return (
            <div key={node.id}>
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/fs-node-id', node.id);
                }}
                onDragOver={(e) => {
                  if (isFolder) {
                    e.preventDefault();
                    setDragOverFolderId(node.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverFolderId === node.id) setDragOverFolderId(undefined);
                }}
                onDrop={(e) => {
                  if (!isFolder) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const draggedId = e.dataTransfer.getData('text/fs-node-id');
                  setDragOverFolderId(undefined);
                  if (draggedId && draggedId !== node.id) {
                    onMoveNode(draggedId, node.id);
                  }
                }}
                onClick={() => {
                  if (isFolder) {
                    setSelectedFolderId(node.id);
                    onToggleFolder(node.id);
                  } else {
                    setSelectedFolderId(node.parentId);
                    onSelectFile(node.id);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, node });
                }}
                className="w-full h-[22px] flex items-center justify-between pr-2 text-[13px] transition-colors group"
                style={{
                  paddingLeft: `${depth * 14 + 8}px`,
                  backgroundColor:
                    dragOverFolderId === node.id
                      ? c.listHoverBg
                      : isSelected
                      ? c.listActiveBg
                      : 'transparent',
                  color: isSelected
                    ? c.listActiveFg
                    : isUntracked
                    ? '#73c991'
                    : isModified
                    ? '#e2c08d'
                    : c.sidebarFg,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = c.listHoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  {isFolder ? (
                    node.isOpen ? (
                      <ChevronDown size={14} className="shrink-0 opacity-75" />
                    ) : (
                      <ChevronRight size={14} className="shrink-0 opacity-75" />
                    )
                  ) : (
                    <span className="w-[14px] shrink-0" />
                  )}
                  <FileIcon
                    name={node.name}
                    language={node.language}
                    isFolder={isFolder}
                    isOpen={node.isOpen}
                    size={14}
                  />
                  <span className="truncate">{node.name}</span>
                </span>

                <span className="flex items-center gap-1 shrink-0 text-[11px] font-mono">
                  {isDirty && <span title="Unsaved changes">●</span>}
                  {!isFolder && isModified && (
                    <span style={{ color: '#e2c08d' }} title="Modified">
                      M
                    </span>
                  )}
                  {!isFolder && isUntracked && (
                    <span style={{ color: '#73c991' }} title="Untracked">
                      U
                    </span>
                  )}
                </span>
              </button>

              {isFolder && node.isOpen && renderTree(node.id, depth + 1)}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* OPEN EDITORS section */}
      <div className="border-b" style={{ borderColor: c.sidebarBorder }}>
        <button
          type="button"
          onClick={() => setOpenEditorsExpanded((v) => !v)}
          className="w-full h-[22px] px-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide hover:bg-white/5"
        >
          {openEditorsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>OPEN EDITORS</span>
          <span className="ml-auto opacity-60 tabular-nums font-normal pr-1">
            {openTabs.length}
          </span>
        </button>

        {openEditorsExpanded && openTabs.length > 0 && (
          <div className="py-0.5 max-h-[130px] overflow-y-auto">
            {openTabs.map((tab) => {
              const isDirty = tab.fileId ? dirtyFileIds.has(tab.fileId) : false;
              const isActive = tab.fileId ? tab.fileId === activeFileId : false;
              const node = tab.fileId ? nodes.find((n) => n.id === tab.fileId) : undefined;
              return (
                <div
                  key={tab.id}
                  className="h-[22px] px-2 flex items-center justify-between text-[12px] group cursor-pointer"
                  style={{
                    backgroundColor: isActive ? c.listActiveBg : 'transparent',
                    color: isActive ? c.listActiveFg : c.sidebarFg,
                  }}
                  onClick={() => tab.fileId && onSelectFile(tab.fileId)}
                >
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                      className="opacity-60 hover:opacity-100 shrink-0"
                      aria-label={`Close ${tab.title}`}
                    >
                      <X size={12} />
                    </button>
                    {node && <FileIcon name={node.name} language={node.language} size={13} />}
                    <span className="truncate">{tab.title}</span>
                  </span>
                  {isDirty && <span className="text-[10px]">●</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WORKSPACE FOLDER TREE */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="h-[22px] px-1.5 flex items-center justify-between text-[11px] font-bold tracking-wide group hover:bg-white/5 shrink-0">
          <button
            type="button"
            onClick={() => setFilesExpanded((v) => !v)}
            className="flex items-center gap-1 min-w-0 truncate"
          >
            {filesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="truncate uppercase">
              {nodes.length === 0 && workspaceName === 'workspace' ? 'NO FOLDER OPENED' : workspaceName}
            </span>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                onSetInlineCreate({ parentId: selectedFolderId, type: 'file' });
                setFilesExpanded(true);
              }}
              className="p-0.5 rounded hover:bg-white/10"
              title="New File..."
              aria-label="New File"
            >
              <FilePlus size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                onSetInlineCreate({ parentId: selectedFolderId, type: 'folder' });
                setFilesExpanded(true);
              }}
              className="p-0.5 rounded hover:bg-white/10"
              title="New Folder..."
              aria-label="New Folder"
            >
              <FolderPlus size={14} />
            </button>
            <button
              type="button"
              onClick={onOpenLocalFolder}
              className="p-0.5 rounded hover:bg-white/10"
              title="Open Local Folder from PC..."
              aria-label="Open Local Folder"
            >
              <FolderUp size={14} />
            </button>
            <button
              type="button"
              onClick={onCollapseAllFolders}
              className="p-0.5 rounded hover:bg-white/10"
              title="Collapse Folders in Explorer"
              aria-label="Collapse Folders"
            >
              <ChevronsDownUp size={14} />
            </button>
          </div>
        </div>

        {filesExpanded && (
          <div
            className="flex-1 overflow-y-auto py-0.5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const draggedId = e.dataTransfer.getData('text/fs-node-id');
              setDragOverFolderId(undefined);
              if (draggedId) onMoveNode(draggedId, null);
            }}
          >
            {nodes.length === 0 && !inlineCreate ? (
              <div className="px-4 py-4 space-y-2.5 text-[12px]">
                <p className="opacity-75 leading-relaxed">
                  You have not yet opened a folder.
                </p>
                <button
                  type="button"
                  onClick={onOpenLocalFolder}
                  className="w-full h-[28px] rounded-[2px] font-medium flex items-center justify-center gap-1.5 hover:opacity-90"
                  style={{
                    backgroundColor: c.buttonBg,
                    color: c.buttonFg,
                  }}
                >
                  <FolderUp size={13} />
                  <span>Open Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    onSetInlineCreate({ parentId: null, type: 'file' });
                  }}
                  className="w-full h-[28px] rounded-[2px] font-medium flex items-center justify-center gap-1.5 hover:bg-white/10"
                  style={{
                    border: `1px solid ${c.inputBorder}`,
                    color: c.sidebarFg,
                  }}
                >
                  <FilePlus size={13} />
                  <span>New File</span>
                </button>
              </div>
            ) : (
              renderTree(null, 0)
            )}
          </div>
        )}
      </div>

      {/* OUTLINE SECTION */}
      <div className="border-t shrink-0" style={{ borderColor: c.sidebarBorder }}>
        <button
          type="button"
          onClick={() => setOutlineExpanded((v) => !v)}
          className="w-full h-[22px] px-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide hover:bg-white/5"
        >
          {outlineExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>OUTLINE</span>
          <span className="ml-auto opacity-60 tabular-nums font-normal pr-1">
            {outlineSymbols.length}
          </span>
        </button>

        {outlineExpanded && (
          <div className="max-h-[150px] overflow-y-auto py-1">
            {outlineSymbols.length === 0 ? (
              <div className="px-4 py-2 text-[12px] opacity-60">
                No symbols found in active editor
              </div>
            ) : (
              outlineSymbols.map((sym, idx) => (
                <button
                  key={`${sym.name}-${idx}`}
                  type="button"
                  onClick={() => activeFile && onSelectFile(activeFile.id, sym.line)}
                  className="w-full h-[22px] px-4 flex items-center justify-between text-[12px] hover:bg-white/10"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Braces size={12} style={{ color: c.accent }} className="shrink-0" />
                    <span className="truncate">{sym.name}</span>
                  </span>
                  <span className="text-[11px] opacity-55 font-mono tabular-nums">
                    :{sym.line}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* TIMELINE SECTION */}
      <div className="border-t shrink-0" style={{ borderColor: c.sidebarBorder }}>
        <button
          type="button"
          onClick={() => setTimelineExpanded((v) => !v)}
          className="w-full h-[22px] px-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide hover:bg-white/5"
        >
          {timelineExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>TIMELINE</span>
          <span className="ml-auto opacity-60 tabular-nums font-normal pr-1">
            {commits.length}
          </span>
        </button>

        {timelineExpanded && (
          <div className="max-h-[130px] overflow-y-auto py-1">
            {commits.map((cm) => (
              <div
                key={cm.id}
                className="px-3 py-1 text-[11.5px] flex items-center gap-2 hover:bg-white/5"
              >
                <History size={12} style={{ color: c.accent }} className="shrink-0" />
                <span className="truncate flex-1">{cm.message}</span>
                <span className="text-[10px] opacity-55 font-mono shrink-0">{cm.hash}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed w-48 py-1 rounded-[6px] shadow-2xl z-50 text-[12px]"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            backgroundColor: c.dropdownBg,
            border: `1px solid ${c.dropdownBorder}`,
            color: c.sidebarFg,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {contextMenu.node.type === 'folder' && (
            <>
              <button
                type="button"
                onClick={() => {
                  const folderId = contextMenu.node.id;
                  setContextMenu(null);
                  setInputValue('');
                  onSetInlineCreate({ parentId: folderId, type: 'file' });
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-white/10"
              >
                <FilePlus size={13} />
                New File...
              </button>
              <button
                type="button"
                onClick={() => {
                  const folderId = contextMenu.node.id;
                  setContextMenu(null);
                  setInputValue('');
                  onSetInlineCreate({ parentId: folderId, type: 'folder' });
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-white/10"
              >
                <FolderPlus size={13} />
                New Folder...
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              const target = contextMenu.node;
              setContextMenu(null);
              setInputValue(target.name);
              setRenamingId(target.id);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-white/10"
          >
            <Pencil size={13} />
            Rename
          </button>
          {contextMenu.node.type === 'file' && (
            <button
              type="button"
              onClick={() => {
                const id = contextMenu.node.id;
                setContextMenu(null);
                onDuplicateFile(id);
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-white/10"
            >
              <Copy size={13} />
              Duplicate File
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const path = getNodePath(nodes, contextMenu.node.id);
              navigator.clipboard?.writeText(path);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-white/10"
          >
            <Copy size={13} />
            Copy Relative Path
          </button>
          <div className="my-1 h-[1px] mx-2" style={{ backgroundColor: c.dropdownBorder }} />
          <button
            type="button"
            onClick={() => {
              const id = contextMenu.node.id;
              setContextMenu(null);
              onDeleteNode(id);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-500/20 text-red-400"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
