import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { User } from '@supabase/supabase-js';
import {
  ActivityView,
  BottomTab,
  DiagnosticItem,
  EditorSettings,
  EditorTab,
  ExtensionItem,
  FileLanguage,
  FSNode,
  GitCommit,
  NotificationItem,
  TerminalSession,
  ThemeId,
} from './types/ide';
import { THEMES } from './data/themes';
import {
  detectLanguage,
  INITIAL_EXTENSIONS,
  INITIAL_FILES,
} from './data/initialWorkspace';
import {
  findNodeByPath,
  getDescendantIds,
  getNodePath,
  normalizePath,
} from './utils/fsHelpers';
import { formatCode, runWorkspaceDiagnostics } from './utils/linter';
import { loadDirectoryFromFileList } from './utils/localFolderLoader';
import { syncWorkspaceModels } from './lib/monacoSetup';
import {
  pullWorkspaceFromSupabase,
  pushWorkspaceToSupabase,
  supabase,
} from './lib/supabase';
import { TitleBar } from './components/TitleBar';
import { ActivityBar } from './components/ActivityBar';
import { Sidebar } from './components/Sidebar';
import { EditorGroupPane } from './components/EditorGroupPane';
import { BottomPanel } from './components/BottomPanel';
import { StatusBar } from './components/StatusBar';
import { CommandItem, CommandPalette } from './components/CommandPalette';
import { CloudAccountModal } from './components/CloudAccountModal';
import { GitChangeItem } from './components/sidebar/SourceControlView';

const STORAGE_FILES_KEY = 'vscode_web_files_v2';
const STORAGE_SETTINGS_KEY = 'vscode_web_settings_v2';

const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'dark-modern',
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  minimap: true,
  lineNumbers: true,
  autoSave: false,
  formatOnSave: false,
  renderWhitespace: false,
};

function createInitialSnapshot(nodes: FSNode[]): Record<string, string> {
  const snap: Record<string, string> = {};
  for (const n of nodes) {
    if (n.type === 'file') {
      snap[n.id] = n.content ?? '';
    }
  }
  return snap;
}

export default function App() {
  const [nodes, setNodes] = useState<FSNode[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FILES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore corrupted storage
    }
    return INITIAL_FILES;
  });

  const [settings, setSettings] = useState<EditorSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [workspaceName, setWorkspaceName] = useState('workspace');
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'table' | 'metadata' | null>(null);
  const [monacoMarkers, setMonacoMarkers] = useState<DiagnosticItem[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const theme = THEMES[settings.theme] || THEMES['dark-modern'];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme.isDark);
  }, [theme.isDark]);

  // Supabase Auth Session Listener
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setCloudUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCloudUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Sync Workspace Files to Monaco Multi-File Models
  useEffect(() => {
    syncWorkspaceModels(nodes);
  }, [nodes]);

  // Listen to live Monaco TypeScript/JSON/CSS/HTML compiler markers
  useEffect(() => {
    const collectMarkers = () => {
      const markers = monaco.editor.getModelMarkers({});
      const mapped: DiagnosticItem[] = [];
      for (const m of markers) {
        if (m.severity < monaco.MarkerSeverity.Warning) continue;
        const relPath = m.resource.path.replace(/^\/+/, '');
        const fileNode = nodes.find(
          (n) => n.type === 'file' && getNodePath(nodes, n.id) === relPath
        );
        if (!fileNode) continue;
        mapped.push({
          id: `monaco-${fileNode.id}-${m.startLineNumber}-${m.startColumn}-${m.message}`,
          fileId: fileNode.id,
          filePath: relPath,
          line: m.startLineNumber,
          col: m.startColumn,
          severity: m.severity === monaco.MarkerSeverity.Error ? 'error' : 'warning',
          message: m.message,
          source: m.source || 'ts',
        });
      }
      setMonacoMarkers(mapped);
    };

    const sub = monaco.editor.onDidChangeMarkers(collectMarkers);
    collectMarkers();
    return () => sub.dispose();
  }, [nodes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(nodes));
    } catch {
      // ignore storage quota errors
    }
  }, [nodes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Layout State
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [activeView, setActiveView] = useState<ActivityView>('explorer');
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelHeight, setPanelHeight] = useState(210);
  const [panelMaximized, setPanelMaximized] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('terminal');

  // Editor Groups & Tabs
  const [primaryTabs, setPrimaryTabs] = useState<EditorTab[]>([
    { id: 'welcome', kind: 'welcome', title: 'Welcome' },
  ]);
  const [activePrimaryTabId, setActivePrimaryTabId] = useState<string | null>('welcome');

  const [splitVisible, setSplitVisible] = useState(false);
  const [secondaryTabs, setSecondaryTabs] = useState<EditorTab[]>([]);
  const [activeSecondaryTabId, setActiveSecondaryTabId] = useState<string | null>(null);
  const [focusedGroup, setFocusedGroup] = useState<'primary' | 'secondary'>('primary');

  // Dirty / Saved tracking
  const [savedContents, setSavedContents] = useState<Record<string, string>>(() =>
    createInitialSnapshot(nodes)
  );

  // Git State
  const [gitBranch, setGitBranch] = useState('main');
  const [branches] = useState(['main']);
  const [committedSnapshot, setCommittedSnapshot] = useState<Record<string, string>>(() =>
    createInitialSnapshot(INITIAL_FILES)
  );
  const [stagedIds, setStagedIds] = useState<Set<string>>(new Set());
  const [commits, setCommits] = useState<GitCommit[]>([]);

  // Navigation History
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navIdx, setNavIdx] = useState(-1);

  // Editor Interaction State
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [jumpToLine, setJumpToLine] = useState<{ fileId: string; line: number; nonce: number } | null>(
    null
  );
  const [findTriggerNonce, setFindTriggerNonce] = useState(0);
  const [breakpoints, setBreakpoints] = useState<Record<string, number[]>>({});
  const [inlineCreate, setInlineCreate] = useState<{
    parentId: string | null;
    type: 'file' | 'folder';
  } | null>(null);

  // Command Palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteInitial, setPaletteInitial] = useState('');

  // Extensions & Logs
  const [extensions, setExtensions] = useState<ExtensionItem[]>(INITIAL_EXTENSIONS);
  const [outputLogs, setOutputLogs] = useState<string[]>([]);
  const [debugLogs, setDebugLogs] = useState<
    Array<{ id: string; type: 'log' | 'error' | 'result'; text: string }>
  >([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Terminal Sessions
  const [terminals, setTerminals] = useState<TerminalSession[]>([
    {
      id: 'term-1',
      name: 'bash',
      cwd: '/',
      lines: [],
      history: [],
    },
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState('term-1');

  const prettierExt = extensions.find((e) => e.id === 'esbenp.prettier-vscode');
  const eslintExt = extensions.find((e) => e.id === 'dbaeumer.vscode-eslint');
  const prettierEnabled = Boolean(prettierExt?.installed && prettierExt.enabled);
  const eslintEnabled = Boolean(eslintExt?.installed && eslintExt.enabled);

  const pushNotification = useCallback(
    (message: string, source = 'Workbench', type: NotificationItem['type'] = 'info') => {
      const item: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random()}`,
        message,
        source,
        type,
        timestamp: Date.now(),
      };
      setNotifications((prev) => [item, ...prev].slice(0, 12));
    },
    []
  );

  const appendOutput = useCallback((msg: string) => {
    setOutputLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Computed Dirty & Git Changes
  const dirtyFileIds = useMemo(() => {
    const dirty = new Set<string>();
    if (settings.autoSave) return dirty;
    for (const n of nodes) {
      if (n.type === 'file') {
        const saved = savedContents[n.id];
        if (saved !== undefined && saved !== (n.content ?? '')) {
          dirty.add(n.id);
        }
      }
    }
    return dirty;
  }, [nodes, savedContents, settings.autoSave]);

  const { gitChanges, modifiedFileIds, untrackedFileIds } = useMemo(() => {
    const list: GitChangeItem[] = [];
    const modSet = new Set<string>();
    const untrackedSet = new Set<string>();

    for (const n of nodes) {
      if (n.type !== 'file') continue;
      const base = committedSnapshot[n.id];
      if (base === undefined) {
        untrackedSet.add(n.id);
        list.push({
          fileId: n.id,
          path: getNodePath(nodes, n.id),
          name: n.name,
          status: 'U',
        });
      } else if (base !== (n.content ?? '')) {
        modSet.add(n.id);
        list.push({
          fileId: n.id,
          path: getNodePath(nodes, n.id),
          name: n.name,
          status: 'M',
        });
      }
    }
    return { gitChanges: list, modifiedFileIds: modSet, untrackedFileIds: untrackedSet };
  }, [nodes, committedSnapshot]);

  // Real Diagnostics (Monaco compiler/language markers + workspace linter)
  const diagnostics = useMemo(() => {
    const fallback = runWorkspaceDiagnostics(nodes, eslintEnabled);
    const seen = new Set(monacoMarkers.map((d) => `${d.fileId}:${d.line}:${d.message}`));
    const merged = [...monacoMarkers];
    for (const item of fallback) {
      if (!seen.has(`${item.fileId}:${item.line}:${item.message}`)) {
        merged.push(item);
      }
    }
    return merged;
  }, [monacoMarkers, nodes, eslintEnabled]);
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  // Active file helper
  const activeTabId =
    focusedGroup === 'secondary' && splitVisible ? activeSecondaryTabId : activePrimaryTabId;
  const activeTabsList =
    focusedGroup === 'secondary' && splitVisible ? secondaryTabs : primaryTabs;
  const activeTab = activeTabsList.find((t) => t.id === activeTabId);
  const activeFile = activeTab?.fileId
    ? nodes.find((n) => n.id === activeTab.fileId)
    : undefined;

  // Open File in focused group
  const openFile = useCallback(
    (fileId: string, line?: number, targetGroup?: 'primary' | 'secondary') => {
      const file = nodes.find((n) => n.id === fileId && n.type === 'file');
      if (!file) return;

      const group = targetGroup || (splitVisible ? focusedGroup : 'primary');
      const tabId = file.id;

      if (group === 'secondary') {
        setSecondaryTabs((prev) =>
          prev.some((t) => t.id === tabId)
            ? prev
            : [...prev, { id: tabId, kind: 'file', fileId: file.id, title: file.name }]
        );
        setActiveSecondaryTabId(tabId);
        setFocusedGroup('secondary');
      } else {
        setPrimaryTabs((prev) =>
          prev.some((t) => t.id === tabId)
            ? prev
            : [...prev, { id: tabId, kind: 'file', fileId: file.id, title: file.name }]
        );
        setActivePrimaryTabId(tabId);
        setFocusedGroup('primary');
      }

      setNavHistory((prev) => {
        const sliced = prev.slice(0, navIdx + 1);
        if (sliced[sliced.length - 1] === file.id) return sliced;
        const next = [...sliced, file.id];
        setNavIdx(next.length - 1);
        return next;
      });

      if (line !== undefined) {
        setJumpToLine({ fileId: file.id, line, nonce: Date.now() });
      }
    },
    [nodes, splitVisible, focusedGroup, navIdx]
  );

  const openSpecialTab = useCallback(
    (tab: EditorTab, group: 'primary' | 'secondary' = 'primary') => {
      if (group === 'secondary') {
        setSplitVisible(true);
        setSecondaryTabs((prev) =>
          prev.some((t) => t.id === tab.id) ? prev : [...prev, tab]
        );
        setActiveSecondaryTabId(tab.id);
        setFocusedGroup('secondary');
      } else {
        setPrimaryTabs((prev) =>
          prev.some((t) => t.id === tab.id) ? prev : [...prev, tab]
        );
        setActivePrimaryTabId(tab.id);
        setFocusedGroup('primary');
      }
    },
    []
  );

  const closeTab = useCallback(
    (tabId: string, group: 'primary' | 'secondary') => {
      if (group === 'primary') {
        setPrimaryTabs((prev) => {
          const next = prev.filter((t) => t.id !== tabId);
          if (activePrimaryTabId === tabId) {
            setActivePrimaryTabId(next[next.length - 1]?.id ?? null);
          }
          return next;
        });
      } else {
        setSecondaryTabs((prev) => {
          const next = prev.filter((t) => t.id !== tabId);
          if (activeSecondaryTabId === tabId) {
            setActiveSecondaryTabId(next[next.length - 1]?.id ?? null);
          }
          if (next.length === 0) {
            setSplitVisible(false);
            setFocusedGroup('primary');
          }
          return next;
        });
      }
    },
    [activePrimaryTabId, activeSecondaryTabId]
  );

  const handleSaveFile = useCallback(
    (fileId?: string) => {
      const targetId = fileId || activeFile?.id;
      if (!targetId) return;
      const target = nodes.find((n) => n.id === targetId && n.type === 'file');
      if (!target) return;

      let contentToSave = target.content ?? '';
      if (settings.formatOnSave && prettierEnabled) {
        contentToSave = formatCode(contentToSave, target.language, settings.tabSize);
        setNodes((prev) =>
          prev.map((n) => (n.id === targetId ? { ...n, content: contentToSave } : n))
        );
      }

      setSavedContents((prev) => ({ ...prev, [targetId]: contentToSave }));
      appendOutput(`Saved ${getNodePath(nodes, targetId)}`);
    },
    [activeFile?.id, nodes, settings.formatOnSave, settings.tabSize, prettierEnabled, appendOutput]
  );

  const handleSaveAll = useCallback(() => {
    const nextSaved: Record<string, string> = {};
    for (const n of nodes) {
      if (n.type === 'file') nextSaved[n.id] = n.content ?? '';
    }
    setSavedContents(nextSaved);
    appendOutput('Saved all open workspace files.');
  }, [nodes, appendOutput]);

  const handleFormatDocument = useCallback(
    (fileId?: string) => {
      const targetId = fileId || activeFile?.id;
      if (!targetId) return;
      const target = nodes.find((n) => n.id === targetId && n.type === 'file');
      if (!target) return;
      const formatted = formatCode(target.content ?? '', target.language, settings.tabSize);
      setNodes((prev) =>
        prev.map((n) => (n.id === targetId ? { ...n, content: formatted } : n))
      );
      appendOutput(`[Prettier] Formatted ${target.name}`);
    },
    [activeFile?.id, nodes, settings.tabSize, appendOutput]
  );

  const handleCreateNode = useCallback(
    (parentId: string | null, type: 'file' | 'folder', name: string) => {
      const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const language = type === 'file' ? detectLanguage(name) : undefined;
      const newNode: FSNode = {
        id,
        name,
        type,
        parentId,
        isOpen: type === 'folder' ? true : undefined,
        language,
        content: type === 'file' ? '' : undefined,
      };

      setNodes((prev) => [
        ...prev.map((n) => (n.id === parentId ? { ...n, isOpen: true } : n)),
        newNode,
      ]);

      if (type === 'file') {
        setSavedContents((prev) => ({ ...prev, [id]: '' }));
        setPrimaryTabs((prev) => [...prev, { id, kind: 'file', fileId: id, title: name }]);
        setActivePrimaryTabId(id);
        setFocusedGroup('primary');
      }
      appendOutput(`Created ${type}: ${name}`);
    },
    [appendOutput]
  );

  const handleRenameNode = useCallback((nodeId: string, newName: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              name: newName,
              language: n.type === 'file' ? detectLanguage(newName) : n.language,
            }
          : n
      )
    );
    setPrimaryTabs((prev) =>
      prev.map((t) => (t.fileId === nodeId ? { ...t, title: newName } : t))
    );
    setSecondaryTabs((prev) =>
      prev.map((t) => (t.fileId === nodeId ? { ...t, title: newName } : t))
    );
  }, []);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;
      const toRemove = new Set([nodeId, ...getDescendantIds(nodes, nodeId)]);
      setNodes((prev) => prev.filter((n) => !toRemove.has(n.id)));
      setPrimaryTabs((prev) => prev.filter((t) => !t.fileId || !toRemove.has(t.fileId)));
      setSecondaryTabs((prev) => prev.filter((t) => !t.fileId || !toRemove.has(t.fileId)));
      appendOutput(`Deleted ${target.name}`);
    },
    [nodes, appendOutput]
  );

  const handleDuplicateFile = useCallback(
    (fileId: string) => {
      const orig = nodes.find((n) => n.id === fileId && n.type === 'file');
      if (!orig) return;
      const dotIdx = orig.name.lastIndexOf('.');
      const copyName =
        dotIdx > 0
          ? `${orig.name.slice(0, dotIdx)}.copy${orig.name.slice(dotIdx)}`
          : `${orig.name}.copy`;
      const id = `file-${Date.now()}`;
      const newNode: FSNode = {
        ...orig,
        id,
        name: copyName,
      };
      setNodes((prev) => [...prev, newNode]);
      setSavedContents((prev) => ({ ...prev, [id]: orig.content ?? '' }));
      setPrimaryTabs((prev) => [...prev, { id, kind: 'file', fileId: id, title: copyName }]);
      setActivePrimaryTabId(id);
    },
    [nodes]
  );

  const handleMoveNode = useCallback(
    (nodeId: string, targetFolderId: string | null) => {
      if (nodeId === targetFolderId) return;
      const descendants = new Set(getDescendantIds(nodes, nodeId));
      if (targetFolderId && descendants.has(targetFolderId)) return;
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === nodeId) return { ...n, parentId: targetFolderId };
          if (targetFolderId && n.id === targetFolderId) return { ...n, isOpen: true };
          return n;
        })
      );
    },
    [nodes]
  );

  const handleReorderTabs = useCallback(
    (group: 'primary' | 'secondary', draggedId: string, targetId: string) => {
      const reorder = (list: EditorTab[]) => {
        const fromIdx = list.findIndex((t) => t.id === draggedId);
        const toIdx = list.findIndex((t) => t.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return list;
        const copy = [...list];
        const [moved] = copy.splice(fromIdx, 1);
        copy.splice(toIdx, 0, moved);
        return copy;
      };
      if (group === 'primary') setPrimaryTabs(reorder);
      else setSecondaryTabs(reorder);
    },
    []
  );

  const handleOpenLocalFolder = useCallback(() => {
    folderInputRef.current?.click();
  }, []);

  const handleFolderSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      try {
        const loaded = await loadDirectoryFromFileList(files);
        if (loaded.nodes.length === 0) {
          pushNotification('No supported text/code files found in selected folder.', 'Explorer', 'warning');
          return;
        }
        setWorkspaceName(loaded.workspaceName);
        setNodes(loaded.nodes);
        const snap = createInitialSnapshot(loaded.nodes);
        setSavedContents(snap);
        setCommittedSnapshot(snap);
        const firstFile = loaded.nodes.find((n) => n.type === 'file');
        setPrimaryTabs(
          firstFile
            ? [{ id: firstFile.id, kind: 'file', fileId: firstFile.id, title: firstFile.name }]
            : [{ id: 'welcome', kind: 'welcome', title: 'Welcome' }]
        );
        setActivePrimaryTabId(firstFile ? firstFile.id : 'welcome');
        setSplitVisible(false);
        setSecondaryTabs([]);
        pushNotification(`Opened local folder "${loaded.workspaceName}" (${loaded.nodes.length} items)`, 'Explorer', 'success');
        appendOutput(`[Explorer] Loaded local project "${loaded.workspaceName}"`);
      } catch (err) {
        pushNotification(err instanceof Error ? err.message : 'Failed to load folder', 'Explorer', 'error');
      } finally {
        e.target.value = '';
      }
    },
    [pushNotification, appendOutput]
  );

  const handlePushToCloud = useCallback(async () => {
    if (!cloudUser) return;
    setCloudSyncing(true);
    try {
      const res = await pushWorkspaceToSupabase(cloudUser, workspaceName, nodes, settings);
      setLastSyncedAt(res.updatedAt);
      setSyncMode(res.mode);
      pushNotification(`Synced workspace "${workspaceName}" to Supabase (${res.mode}).`, 'Supabase', 'success');
      appendOutput(`[Supabase] Saved workspace to cloud (${res.mode})`);
    } catch (err) {
      pushNotification(err instanceof Error ? err.message : 'Cloud sync failed', 'Supabase', 'error');
    } finally {
      setCloudSyncing(false);
    }
  }, [cloudUser, workspaceName, nodes, settings, pushNotification, appendOutput]);

  const handlePullFromCloud = useCallback(async () => {
    if (!cloudUser) return;
    setCloudSyncing(true);
    try {
      const res = await pullWorkspaceFromSupabase(cloudUser, workspaceName);
      if (res.mode === 'empty' || !res.files) {
        pushNotification('No cloud workspace saved yet. Click "Save to Cloud" first.', 'Supabase', 'info');
        return;
      }
      setNodes(res.files);
      if (res.settings) setSettings(res.settings);
      if (res.name) setWorkspaceName(res.name);
      const snap = createInitialSnapshot(res.files);
      setSavedContents(snap);
      setCommittedSnapshot(snap);
      setLastSyncedAt(res.updatedAt ?? new Date().toISOString());
      setSyncMode(res.mode);
      const firstFile = res.files.find((n) => n.type === 'file');
      if (firstFile) {
        setPrimaryTabs([{ id: firstFile.id, kind: 'file', fileId: firstFile.id, title: firstFile.name }]);
        setActivePrimaryTabId(firstFile.id);
      }
      pushNotification(`Loaded workspace "${res.name || workspaceName}" from Supabase.`, 'Supabase', 'success');
      appendOutput(`[Supabase] Loaded workspace from cloud (${res.mode})`);
    } catch (err) {
      pushNotification(err instanceof Error ? err.message : 'Cloud load failed', 'Supabase', 'error');
    } finally {
      setCloudSyncing(false);
    }
  }, [cloudUser, workspaceName, pushNotification, appendOutput]);

  // Run JS File safely in browser sandbox
  const handleRunActiveFile = useCallback(
    (explicitFileId?: string) => {
      const target = explicitFileId
        ? nodes.find((n) => n.id === explicitFileId)
        : activeFile &&
          (activeFile.language === 'javascript' ||
            activeFile.language === 'typescript' ||
            activeFile.language === 'html' ||
            activeFile.language === 'markdown')
        ? activeFile
        : undefined;

      if (!target) {
        pushNotification('Open a JavaScript, TypeScript, HTML, or Markdown file to run it.', 'Run', 'info');
        return;
      }

      if (target.language === 'html' || target.language === 'markdown') {
        openSpecialTab(
          {
            id: `preview:${target.id}`,
            kind: 'preview',
            fileId: target.id,
            title: `Preview ${target.name}`,
          },
          'secondary'
        );
        return;
      }

      setPanelVisible(true);
      setActiveBottomTab('debug');
      const captured: Array<{ id: string; type: 'log' | 'error' | 'result'; text: string }> = [
        {
          id: `run-${Date.now()}`,
          type: 'result',
          text: `▶ Running ${getNodePath(nodes, target.id)}...`,
        },
      ];

      const mockConsole = {
        log: (...args: unknown[]) =>
          captured.push({
            id: `l-${Date.now()}-${Math.random()}`,
            type: 'log',
            text: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
          }),
        warn: (...args: unknown[]) =>
          captured.push({
            id: `w-${Date.now()}-${Math.random()}`,
            type: 'log',
            text: `⚠ ${args.map(String).join(' ')}`,
          }),
        error: (...args: unknown[]) =>
          captured.push({
            id: `e-${Date.now()}-${Math.random()}`,
            type: 'error',
            text: `✖ ${args.map(String).join(' ')}`,
          }),
      };

      try {
        // Strip simple TS export/import lines if user runs a .ts snippet
        const runnable = (target.content ?? '')
          .replace(/^\s*import\s+.*?;?\s*$/gm, '')
          .replace(/^\s*export\s+(default\s+)?/gm, '');
        const fn = new Function('console', runnable);
        fn(mockConsole);
      } catch (err) {
        captured.push({
          id: `err-${Date.now()}`,
          type: 'error',
          text: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        });
      }

      setDebugLogs((prev) => [...prev, ...captured]);
    },
    [nodes, activeFile, openSpecialTab, pushNotification]
  );

  // Interactive Terminal Command Execution
  const handleRunTerminalCommand = useCallback(
    (sessionId: string, rawCmd: string) => {
      const cmdLine = rawCmd.trim();
      const session = terminals.find((t) => t.id === sessionId);
      if (!session) return;

      const promptEcho = `dev@vscode:~${session.cwd === '/' ? '' : session.cwd}$ ${rawCmd}`;
      const outLines: TerminalSession['lines'] = [
        { id: `in-${Date.now()}`, type: 'output', text: promptEcho },
      ];

      if (!cmdLine) {
        setTerminals((prev) =>
          prev.map((t) =>
            t.id === sessionId ? { ...t, lines: [...t.lines, ...outLines] } : t
          )
        );
        return;
      }

      if (cmdLine === 'clear') {
        setTerminals((prev) =>
          prev.map((t) =>
            t.id === sessionId
              ? { ...t, lines: [], history: [...t.history, cmdLine] }
              : t
          )
        );
        return;
      }

      const parts = cmdLine.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
      const cmd = parts[0];
      const args = parts.slice(1).map((a) => a.replace(/^["']|["']$/g, ''));

      let nextCwd = session.cwd;

      const pushOut = (text: string, type: 'output' | 'error' | 'info' | 'success' = 'output') => {
        outLines.push({ id: `o-${Date.now()}-${Math.random()}`, type, text });
      };

      switch (cmd) {
        case 'help':
          pushOut(
            [
              'Available commands:',
              '  ls [path]        List directory contents',
              '  cd <dir>         Change directory',
              '  pwd              Print working directory',
              '  cat <file>       Display file contents',
              '  touch <file>     Create a new empty file',
              '  mkdir <dir>      Create a new folder',
              '  rm <file>        Delete a file',
              '  code <file>      Open file in VS Code editor',
              '  node <file.js>   Execute JavaScript file',
              '  git status|log   Inspect repository status or commits',
              '  npm test|dev     Run workspace scripts',
              '  clear            Clear terminal screen',
            ].join('\n'),
            'info'
          );
          break;

        case 'pwd':
          pushOut(session.cwd === '/' ? `/${workspaceName}` : `/${workspaceName}${session.cwd}`);
          break;

        case 'whoami':
          pushOut('developer');
          break;

        case 'date':
          pushOut(new Date().toString());
          break;

        case 'echo':
          pushOut(args.join(' '));
          break;

        case 'ls': {
          const targetPath = args[0] ? normalizePath(args[0], session.cwd) : session.cwd;
          const clean = targetPath.replace(/^\/+/, '');
          let parentId: string | null = null;
          if (clean) {
            const folder = nodes.find((n) => n.type === 'folder' && getNodePath(nodes, n.id) === clean);
            if (!folder) {
              pushOut(`ls: cannot access '${args[0]}': No such directory`, 'error');
              break;
            }
            parentId = folder.id;
          }
          const entries = nodes
            .filter((n) => n.parentId === parentId)
            .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1))
            .map((n) => (n.type === 'folder' ? `${n.name}/` : n.name));
          pushOut(entries.join('   ') || '(empty)');
          break;
        }

        case 'cd': {
          if (!args[0] || args[0] === '~' || args[0] === '/') {
            nextCwd = '/';
            break;
          }
          const targetPath = normalizePath(args[0], session.cwd);
          const clean = targetPath.replace(/^\/+/, '');
          if (!clean) {
            nextCwd = '/';
            break;
          }
          const folder = nodes.find((n) => n.type === 'folder' && getNodePath(nodes, n.id) === clean);
          if (!folder) {
            pushOut(`cd: ${args[0]}: No such directory`, 'error');
          } else {
            nextCwd = targetPath;
          }
          break;
        }

        case 'cat': {
          if (!args[0]) {
            pushOut('usage: cat <file>', 'error');
            break;
          }
          const file = findNodeByPath(nodes, args[0], session.cwd);
          if (!file || file.type !== 'file') {
            pushOut(`cat: ${args[0]}: No such file`, 'error');
          } else {
            pushOut(file.content || '');
          }
          break;
        }

        case 'code': {
          if (!args[0]) {
            pushOut('usage: code <file>', 'error');
            break;
          }
          const file = findNodeByPath(nodes, args[0], session.cwd);
          if (!file || file.type !== 'file') {
            pushOut(`code: ${args[0]}: File not found`, 'error');
          } else {
            openFile(file.id);
            pushOut(`Opened ${file.name} in editor.`, 'success');
          }
          break;
        }

        case 'touch': {
          if (!args[0]) {
            pushOut('usage: touch <filename>', 'error');
            break;
          }
          const targetPath = normalizePath(args[0], session.cwd).replace(/^\/+/, '');
          const segments = targetPath.split('/');
          const name = segments.pop()!;
          const parentPath = segments.join('/');
          let parentId: string | null = null;
          if (parentPath) {
            const pFolder = nodes.find((n) => n.type === 'folder' && getNodePath(nodes, n.id) === parentPath);
            if (!pFolder) {
              pushOut(`touch: directory '${parentPath}' does not exist`, 'error');
              break;
            }
            parentId = pFolder.id;
          }
          handleCreateNode(parentId, 'file', name);
          pushOut(`Created file ${targetPath}`, 'success');
          break;
        }

        case 'mkdir': {
          if (!args[0]) {
            pushOut('usage: mkdir <folder>', 'error');
            break;
          }
          const targetPath = normalizePath(args[0], session.cwd).replace(/^\/+/, '');
          const segments = targetPath.split('/');
          const name = segments.pop()!;
          const parentPath = segments.join('/');
          let parentId: string | null = null;
          if (parentPath) {
            const pFolder = nodes.find((n) => n.type === 'folder' && getNodePath(nodes, n.id) === parentPath);
            if (!pFolder) {
              pushOut(`mkdir: directory '${parentPath}' does not exist`, 'error');
              break;
            }
            parentId = pFolder.id;
          }
          handleCreateNode(parentId, 'folder', name);
          pushOut(`Created folder ${targetPath}`, 'success');
          break;
        }

        case 'rm': {
          if (!args[0]) {
            pushOut('usage: rm <file>', 'error');
            break;
          }
          const target = findNodeByPath(nodes, args[0], session.cwd);
          if (!target) {
            pushOut(`rm: cannot remove '${args[0]}': No such file`, 'error');
          } else {
            handleDeleteNode(target.id);
            pushOut(`Removed ${args[0]}`, 'success');
          }
          break;
        }

        case 'node': {
          if (!args[0]) {
            pushOut('usage: node <script.js>', 'error');
            break;
          }
          const file = findNodeByPath(nodes, args[0], session.cwd);
          if (!file || file.type !== 'file') {
            pushOut(`Error: Cannot find module '${args[0]}'`, 'error');
            break;
          }
          const logs: string[] = [];
          const customConsole = {
            log: (...a: unknown[]) => logs.push(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')),
            warn: (...a: unknown[]) => logs.push(a.map(String).join(' ')),
            error: (...a: unknown[]) => logs.push(`ERROR: ${a.map(String).join(' ')}`),
          };
          try {
            const runnable = (file.content ?? '')
              .replace(/^\s*import\s+.*?;?\s*$/gm, '')
              .replace(/^\s*export\s+(default\s+)?/gm, '');
            const fn = new Function('console', runnable);
            fn(customConsole);
            pushOut(logs.join('\n') || '(process exited with code 0)');
          } catch (err) {
            pushOut(err instanceof Error ? `${err.name}: ${err.message}` : String(err), 'error');
          }
          break;
        }

        case 'git': {
          const sub = args[0];
          if (sub === 'status') {
            if (gitChanges.length === 0) {
              pushOut(`On branch ${gitBranch}\nnothing to commit, working tree clean`, 'success');
            } else {
              pushOut(
                `On branch ${gitBranch}\nChanges:\n` +
                  gitChanges.map((ch) => `  ${ch.status === 'M' ? 'modified:' : 'untracked:'}  ${ch.path}`).join('\n'),
                'info'
              );
            }
          } else if (sub === 'log') {
            pushOut(
              commits
                .map((cm) => `commit ${cm.hash} (${gitBranch})\nAuthor: ${cm.author}\n\n    ${cm.message}\n`)
                .join('\n')
            );
          } else {
            pushOut(`git: supported subcommands are 'status' and 'log'`, 'info');
          }
          break;
        }

        case 'npm': {
          if (args[0] === 'test') {
            const pkgNode = nodes.find((n) => n.name === 'package.json' && n.parentId === null);
            let pkgName = workspaceName;
            if (pkgNode?.content) {
              try {
                pkgName = JSON.parse(pkgNode.content).name || workspaceName;
              } catch {
                // ignore invalid json
              }
            }
            pushOut(
              `> ${pkgName} test\n\n ✓ Diagnostics scan (${errorCount} errors, ${warningCount} warnings)\n`,
              errorCount > 0 ? 'error' : 'success'
            );
          } else if (args[0] === 'run' && args[1] === 'dev') {
            pushOut('VITE ready\n➜  Local:   http://localhost:3000/', 'success');
          } else {
            pushOut('npm scripts: "npm run dev", "npm test"', 'info');
          }
          break;
        }

        default:
          pushOut(`bash: ${cmd}: command not found. Type "help" for available commands.`, 'error');
      }

      setTerminals((prev) =>
        prev.map((t) =>
          t.id === sessionId
            ? {
                ...t,
                cwd: nextCwd,
                lines: [...t.lines, ...outLines],
                history: [...t.history, cmdLine],
              }
            : t
        )
      );
    },
    [terminals, nodes, workspaceName, gitChanges, gitBranch, commits, errorCount, warningCount, openFile, handleCreateNode, handleDeleteNode]
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === 'F1' || (mod && e.shiftKey && e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setPaletteInitial('>');
        setPaletteOpen(true);
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteInitial('');
        setPaletteOpen(true);
      } else if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarVisible((v) => !v);
      } else if (mod && (e.key.toLowerCase() === 'j' || e.key === '`')) {
        e.preventDefault();
        setPanelVisible((v) => !v);
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile();
      } else if (mod && e.key === '\\') {
        e.preventDefault();
        if (!splitVisible && activeFile) {
          openSpecialTab(
            { id: activeFile.id, kind: 'file', fileId: activeFile.id, title: activeFile.name },
            'secondary'
          );
        } else {
          setSplitVisible((v) => !v);
        }
      } else if (mod && e.key === ',') {
        e.preventDefault();
        openSpecialTab({ id: 'settings', kind: 'settings', title: 'Settings' }, 'primary');
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setSidebarVisible(true);
        setActiveView('explorer');
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSidebarVisible(true);
        setActiveView('search');
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setSidebarVisible(true);
        setActiveView('git');
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setSidebarVisible(true);
        setActiveView('extensions');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSaveFile, splitVisible, activeFile, openSpecialTab]);

  // Sash Resize Handlers
  const resizingSidebar = useRef(false);
  const resizingPanel = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (resizingSidebar.current) {
        const w = Math.max(180, Math.min(480, e.clientX - 48));
        setSidebarWidth(w);
      } else if (resizingPanel.current) {
        const h = Math.max(110, Math.min(window.innerHeight - 180, window.innerHeight - 22 - e.clientY));
        setPanelHeight(h);
        setPanelMaximized(false);
      }
    };
    const onMouseUp = () => {
      resizingSidebar.current = false;
      resizingPanel.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Command Palette Registry
  const commands: CommandItem[] = [
    {
      id: 'theme-picker',
      category: 'Preferences',
      label: 'Color Theme',
      action: () => {},
    },
    {
      id: 'open-settings',
      category: 'Preferences',
      label: 'Open Settings (UI)',
      shortcut: 'Ctrl+,',
      action: () => openSpecialTab({ id: 'settings', kind: 'settings', title: 'Settings' }),
    },
    {
      id: 'new-file',
      category: 'File',
      label: 'New File',
      shortcut: 'Ctrl+N',
      action: () => {
        setSidebarVisible(true);
        setActiveView('explorer');
        setInlineCreate({ parentId: null, type: 'file' });
      },
    },
    {
      id: 'save-file',
      category: 'File',
      label: 'Save Active File',
      shortcut: 'Ctrl+S',
      action: () => handleSaveFile(),
    },
    {
      id: 'format-doc',
      category: 'Format',
      label: 'Format Document',
      shortcut: 'Shift+Alt+F',
      action: () => handleFormatDocument(),
    },
    {
      id: 'toggle-sidebar',
      category: 'View',
      label: 'Toggle Primary Side Bar',
      shortcut: 'Ctrl+B',
      action: () => setSidebarVisible((v) => !v),
    },
    {
      id: 'toggle-terminal',
      category: 'View',
      label: 'Toggle Terminal',
      shortcut: 'Ctrl+`',
      action: () => {
        setPanelVisible((v) => !v);
        setActiveBottomTab('terminal');
      },
    },
    {
      id: 'show-explorer',
      category: 'View',
      label: 'Show Explorer',
      shortcut: 'Ctrl+Shift+E',
      action: () => {
        setSidebarVisible(true);
        setActiveView('explorer');
      },
    },
    {
      id: 'show-search',
      category: 'View',
      label: 'Show Search',
      shortcut: 'Ctrl+Shift+F',
      action: () => {
        setSidebarVisible(true);
        setActiveView('search');
      },
    },
    {
      id: 'show-git',
      category: 'View',
      label: 'Show Source Control',
      shortcut: 'Ctrl+Shift+G',
      action: () => {
        setSidebarVisible(true);
        setActiveView('git');
      },
    },
    {
      id: 'show-extensions',
      category: 'View',
      label: 'Show Extensions',
      shortcut: 'Ctrl+Shift+X',
      action: () => {
        setSidebarVisible(true);
        setActiveView('extensions');
      },
    },
    {
      id: 'show-debug-console',
      category: 'View',
      label: 'Show Debug Console',
      action: () => {
        setPanelVisible(true);
        setActiveBottomTab('debug');
      },
    },
    {
      id: 'split-editor',
      category: 'View',
      label: 'Split Editor Right',
      shortcut: 'Ctrl+\\',
      action: () => {
        if (activeFile) {
          openSpecialTab(
            { id: activeFile.id, kind: 'file', fileId: activeFile.id, title: activeFile.name },
            'secondary'
          );
        } else {
          setSplitVisible((v) => !v);
        }
      },
    },
    {
      id: 'run-file',
      category: 'Run',
      label: 'Run Active File',
      shortcut: 'F5',
      action: () => handleRunActiveFile(),
    },
  ];

  const handleToggleSplit = () => {
    if (splitVisible) {
      setSplitVisible(false);
      setFocusedGroup('primary');
    } else if (activeFile) {
      openSpecialTab(
        { id: activeFile.id, kind: 'file', fileId: activeFile.id, title: activeFile.name },
        'secondary'
      );
    } else {
      openSpecialTab({ id: 'welcome', kind: 'welcome', title: 'Welcome' }, 'secondary');
    }
  };

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={
        {
          backgroundColor: theme.colors.editorBg,
          color: theme.colors.editorFg,
          '--vscode-focus-border': theme.colors.focusBorder,
        } as React.CSSProperties
      }
    >
      {/* Hidden Local Folder Picker Input */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is supported in Chromium/Firefox/Safari for local folder selection
        webkitdirectory=""
        className="hidden"
        onChange={handleFolderSelected}
      />

      {/* Top Title Bar */}
      <TitleBar
        theme={theme}
        workspaceName={workspaceName}
        activeFileTitle={activeFile?.name}
        sidebarVisible={sidebarVisible}
        panelVisible={panelVisible}
        splitActive={splitVisible}
        cloudUserEmail={cloudUser?.email ?? null}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        onTogglePanel={() => setPanelVisible((v) => !v)}
        onToggleSplit={handleToggleSplit}
        onOpenCommandPalette={(prefix = '') => {
          setPaletteInitial(prefix);
          setPaletteOpen(true);
        }}
        onToggleThemeQuick={() =>
          setSettings((prev) => ({
            ...prev,
            theme: theme.isDark ? 'light-modern' : 'dark-modern',
          }))
        }
        onNewFile={() => {
          setSidebarVisible(true);
          setActiveView('explorer');
          setInlineCreate({ parentId: null, type: 'file' });
        }}
        onNewFolder={() => {
          setSidebarVisible(true);
          setActiveView('explorer');
          setInlineCreate({ parentId: null, type: 'folder' });
        }}
        onOpenLocalFolder={handleOpenLocalFolder}
        onOpenCloudSync={() => setCloudModalOpen(true)}
        onSaveFile={() => handleSaveFile()}
        onSaveAll={handleSaveAll}
        onCloseTab={() => {
          if (activeTabId) closeTab(activeTabId, focusedGroup);
        }}
        onFormatDocument={() => handleFormatDocument()}
        onOpenFind={() => setFindTriggerNonce((n) => n + 1)}
        onOpenSettings={() =>
          openSpecialTab({ id: 'settings', kind: 'settings', title: 'Settings' })
        }
        onOpenWelcome={() =>
          openSpecialTab({ id: 'welcome', kind: 'welcome', title: 'Welcome' })
        }
        onRunActiveFile={() => handleRunActiveFile()}
        onNewTerminal={() => {
          const id = `term-${Date.now()}`;
          setTerminals((prev) => [
            ...prev,
            {
              id,
              name: `bash (${prev.length + 1})`,
              cwd: '/',
              lines: [{ id: `init-${id}`, type: 'info', text: 'New terminal session started.' }],
              history: [],
            },
          ]);
          setActiveTerminalId(id);
          setPanelVisible(true);
          setActiveBottomTab('terminal');
        }}
        onNavigateHistory={(dir) => {
          const nextIdx = dir === 'back' ? navIdx - 1 : navIdx + 1;
          if (nextIdx >= 0 && nextIdx < navHistory.length) {
            setNavIdx(nextIdx);
            const targetId = navHistory[nextIdx];
            const exists = nodes.find((n) => n.id === targetId);
            if (exists) {
              setPrimaryTabs((prev) =>
                prev.some((t) => t.id === exists.id)
                  ? prev
                  : [...prev, { id: exists.id, kind: 'file', fileId: exists.id, title: exists.name }]
              );
              setActivePrimaryTabId(exists.id);
            }
          }
        }}
        canGoBack={navIdx > 0}
        canGoForward={navIdx < navHistory.length - 1}
      />

      {/* Workbench Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Activity Bar */}
        <ActivityBar
          theme={theme}
          activeView={activeView}
          sidebarVisible={sidebarVisible}
          gitChangesCount={gitChanges.length}
          cloudUserEmail={cloudUser?.email ?? null}
          onSelectView={(view) => {
            if (sidebarVisible && activeView === view) {
              setSidebarVisible(false);
            } else {
              setSidebarVisible(true);
              setActiveView(view);
            }
          }}
          onOpenSettings={() =>
            openSpecialTab({ id: 'settings', kind: 'settings', title: 'Settings' })
          }
          onOpenThemes={() => {
            setPaletteInitial('>Preferences: Color Theme');
            setPaletteOpen(true);
          }}
          onOpenCommandPalette={() => {
            setPaletteInitial('>');
            setPaletteOpen(true);
          }}
          onOpenCloudSync={() => setCloudModalOpen(true)}
        />

        {/* Resizable Primary Side Bar */}
        {sidebarVisible && (
          <>
            <Sidebar
              theme={theme}
              width={sidebarWidth}
              activeView={activeView}
              workspaceName={workspaceName}
              nodes={nodes}
              activeFileId={activeFile?.id}
              openTabs={primaryTabs.filter((t) => t.kind === 'file')}
              dirtyFileIds={dirtyFileIds}
              modifiedFileIds={modifiedFileIds}
              untrackedFileIds={untrackedFileIds}
              gitBranch={gitBranch}
              gitChanges={gitChanges}
              stagedIds={stagedIds}
              commits={commits}
              breakpoints={breakpoints}
              extensions={extensions}
              inlineCreate={inlineCreate}
              onSetInlineCreate={setInlineCreate}
              onSelectFile={(fid, ln) => openFile(fid, ln)}
              onCloseTab={(tid) => closeTab(tid, 'primary')}
              onToggleFolder={(folderId) =>
                setNodes((prev) =>
                  prev.map((n) => (n.id === folderId ? { ...n, isOpen: !n.isOpen } : n))
                )
              }
              onCollapseAllFolders={() =>
                setNodes((prev) =>
                  prev.map((n) => (n.type === 'folder' ? { ...n, isOpen: false } : n))
                )
              }
              onCreateNode={handleCreateNode}
              onRenameNode={handleRenameNode}
              onDeleteNode={handleDeleteNode}
              onDuplicateFile={handleDuplicateFile}
              onMoveNode={handleMoveNode}
              onOpenLocalFolder={handleOpenLocalFolder}
              onReplaceAllInWorkspace={(query, replacement, matchCase) => {
                let total = 0;
                const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escaped, matchCase ? 'g' : 'gi');
                setNodes((prev) =>
                  prev.map((n) => {
                    if (n.type !== 'file' || !n.content) return n;
                    const count = (n.content.match(regex) || []).length;
                    if (count === 0) return n;
                    total += count;
                    return { ...n, content: n.content.replace(regex, replacement) };
                  })
                );
                return total;
              }}
              onToggleStage={(fid) =>
                setStagedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(fid)) next.delete(fid);
                  else next.add(fid);
                  return next;
                })
              }
              onStageAll={() => setStagedIds(new Set(gitChanges.map((ch) => ch.fileId)))}
              onDiscardChange={(fid) => {
                const orig = committedSnapshot[fid];
                if (orig === undefined) {
                  handleDeleteNode(fid);
                } else {
                  setNodes((prev) =>
                    prev.map((n) => (n.id === fid ? { ...n, content: orig } : n))
                  );
                  setSavedContents((prev) => ({ ...prev, [fid]: orig }));
                }
              }}
              onCommit={(message) => {
                const snap = createInitialSnapshot(nodes);
                const newCommit: GitCommit = {
                  id: `c-${Date.now()}`,
                  hash: Math.random().toString(16).slice(2, 9),
                  message,
                  author: 'Developer',
                  timestamp: Date.now(),
                  filesChanged: gitChanges.length,
                  snapshot: snap,
                };
                setCommittedSnapshot(snap);
                setSavedContents(snap);
                setStagedIds(new Set());
                setCommits((prev) => [newCommit, ...prev]);
                pushNotification(`Committed "${message}" (${newCommit.hash})`, 'Git', 'success');
                appendOutput(`[Git] Committed ${newCommit.hash}: ${message}`);
              }}
              onOpenDiff={(fid) => {
                const file = nodes.find((n) => n.id === fid);
                if (!file) return;
                openSpecialTab({
                  id: `diff:${fid}`,
                  kind: 'diff',
                  fileId: fid,
                  title: `${file.name} (Working Tree)`,
                });
              }}
              onRunActiveFile={() => handleRunActiveFile()}
              onOpenPreview={() => {
                if (activeFile) {
                  openSpecialTab(
                    {
                      id: `preview:${activeFile.id}`,
                      kind: 'preview',
                      fileId: activeFile.id,
                      title: `Preview ${activeFile.name}`,
                    },
                    'secondary'
                  );
                }
              }}
              onRemoveBreakpoint={(fid, line) =>
                setBreakpoints((prev) => ({
                  ...prev,
                  [fid]: (prev[fid] || []).filter((l) => l !== line),
                }))
              }
              onToggleInstallExtension={(id) =>
                setExtensions((prev) =>
                  prev.map((e) =>
                    e.id === id ? { ...e, installed: !e.installed, enabled: !e.installed } : e
                  )
                )
              }
              onToggleEnableExtension={(id) =>
                setExtensions((prev) =>
                  prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
                )
              }
              onOpenCommandPalette={() => {
                setPaletteInitial('>');
                setPaletteOpen(true);
              }}
            />
            {/* Vertical Resize Sash */}
            <div
              onMouseDown={() => {
                resizingSidebar.current = true;
                document.body.style.cursor = 'col-resize';
              }}
              className="vscode-sash-v w-[3px] h-full shrink-0"
              style={{ backgroundColor: 'transparent' }}
            />
          </>
        )}

        {/* Right Area: Editor Groups + Bottom Panel */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Primary Editor Group */}
            <EditorGroupPane
              groupId="primary"
              theme={theme}
              settings={settings}
              tabs={primaryTabs}
              activeTabId={activePrimaryTabId}
              nodes={nodes}
              dirtyFileIds={dirtyFileIds}
              committedSnapshot={committedSnapshot}
              breakpoints={breakpoints}
              jumpToLine={jumpToLine}
              findTriggerNonce={findTriggerNonce}
              isFocused={!splitVisible || focusedGroup === 'primary'}
              onFocusGroup={() => setFocusedGroup('primary')}
              onSelectTab={setActivePrimaryTabId}
              onCloseTab={(tid) => closeTab(tid, 'primary')}
              onReorderTabs={(draggedId, targetId) =>
                handleReorderTabs('primary', draggedId, targetId)
              }
              onChangeContent={(fid, val) => {
                setNodes((prev) =>
                  prev.map((n) => (n.id === fid ? { ...n, content: val } : n))
                );
                if (settings.autoSave) {
                  setSavedContents((prev) => ({ ...prev, [fid]: val }));
                }
              }}
              onSaveFile={handleSaveFile}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
              onToggleBreakpoint={(fid, ln) =>
                setBreakpoints((prev) => {
                  const list = prev[fid] || [];
                  const next = list.includes(ln)
                    ? list.filter((l) => l !== ln)
                    : [...list, ln].sort((a, b) => a - b);
                  return { ...prev, [fid]: next };
                })
              }
              onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
              onResetWorkspace={() => {
                setWorkspaceName('workspace');
                setNodes([]);
                setCommittedSnapshot({});
                setSavedContents({});
                setCommits([]);
                setStagedIds(new Set());
                setPrimaryTabs([{ id: 'welcome', kind: 'welcome', title: 'Welcome' }]);
                setActivePrimaryTabId('welcome');
                setSecondaryTabs([]);
                setSplitVisible(false);
                setOutputLogs([]);
                setDebugLogs([]);
                setSettings(DEFAULT_SETTINGS);
                pushNotification('Workspace cleared and reset to clean state.', 'Workbench', 'info');
              }}
              onOpenFile={(fid, ln) => openFile(fid, ln, 'primary')}
              onNewFile={() => {
                setSidebarVisible(true);
                setActiveView('explorer');
                setInlineCreate({ parentId: null, type: 'file' });
              }}
              onOpenLocalFolder={handleOpenLocalFolder}
              onOpenQuickOpen={() => {
                setPaletteInitial('');
                setPaletteOpen(true);
              }}
              onOpenTerminal={() => {
                setPanelVisible(true);
                setActiveBottomTab('terminal');
              }}
              onOpenThemes={() => {
                setPaletteInitial('>Preferences: Color Theme');
                setPaletteOpen(true);
              }}
              onOpenCloudSync={() => setCloudModalOpen(true)}
              onRunActiveFile={handleRunActiveFile}
              onOpenPreview={(fid) => {
                const file = nodes.find((n) => n.id === fid);
                if (!file) return;
                openSpecialTab(
                  {
                    id: `preview:${fid}`,
                    kind: 'preview',
                    fileId: fid,
                    title: `Preview ${file.name}`,
                  },
                  'secondary'
                );
              }}
              onSplitEditor={handleToggleSplit}
              onFormatDocument={handleFormatDocument}
            />

            {/* Secondary Split Editor Group */}
            {splitVisible && (
              <>
                <div
                  className="w-[1px] h-full shrink-0"
                  style={{ backgroundColor: theme.colors.tabBorder }}
                />
                <EditorGroupPane
                  groupId="secondary"
                  theme={theme}
                  settings={settings}
                  tabs={secondaryTabs}
                  activeTabId={activeSecondaryTabId}
                  nodes={nodes}
                  dirtyFileIds={dirtyFileIds}
                  committedSnapshot={committedSnapshot}
                  breakpoints={breakpoints}
                  jumpToLine={jumpToLine}
                  findTriggerNonce={findTriggerNonce}
                  isFocused={focusedGroup === 'secondary'}
                  onFocusGroup={() => setFocusedGroup('secondary')}
                  onSelectTab={setActiveSecondaryTabId}
                  onCloseTab={(tid) => closeTab(tid, 'secondary')}
                  onReorderTabs={(draggedId, targetId) =>
                    handleReorderTabs('secondary', draggedId, targetId)
                  }
                  onChangeContent={(fid, val) => {
                    setNodes((prev) =>
                      prev.map((n) => (n.id === fid ? { ...n, content: val } : n))
                    );
                    if (settings.autoSave) {
                      setSavedContents((prev) => ({ ...prev, [fid]: val }));
                    }
                  }}
                  onSaveFile={handleSaveFile}
                  onCursorChange={(line, col) => setCursorPos({ line, col })}
                  onToggleBreakpoint={(fid, ln) =>
                    setBreakpoints((prev) => {
                      const list = prev[fid] || [];
                      const next = list.includes(ln)
                        ? list.filter((l) => l !== ln)
                        : [...list, ln].sort((a, b) => a - b);
                      return { ...prev, [fid]: next };
                    })
                  }
                  onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
                  onResetWorkspace={() => {
                    setWorkspaceName('workspace');
                    setNodes([]);
                    setCommittedSnapshot({});
                    setSavedContents({});
                    setCommits([]);
                    setStagedIds(new Set());
                    setPrimaryTabs([{ id: 'welcome', kind: 'welcome', title: 'Welcome' }]);
                    setActivePrimaryTabId('welcome');
                    setSecondaryTabs([]);
                    setSplitVisible(false);
                    setOutputLogs([]);
                    setDebugLogs([]);
                    setSettings(DEFAULT_SETTINGS);
                    pushNotification('Workspace cleared and reset to clean state.', 'Workbench', 'info');
                  }}
                  onOpenFile={(fid, ln) => openFile(fid, ln, 'secondary')}
                  onNewFile={() => {
                    setSidebarVisible(true);
                    setActiveView('explorer');
                    setInlineCreate({ parentId: null, type: 'file' });
                  }}
                  onOpenLocalFolder={handleOpenLocalFolder}
                  onOpenQuickOpen={() => {
                    setPaletteInitial('');
                    setPaletteOpen(true);
                  }}
                  onOpenTerminal={() => {
                    setPanelVisible(true);
                    setActiveBottomTab('terminal');
                  }}
                  onOpenThemes={() => {
                    setPaletteInitial('>Preferences: Color Theme');
                    setPaletteOpen(true);
                  }}
                  onOpenCloudSync={() => setCloudModalOpen(true)}
                  onRunActiveFile={handleRunActiveFile}
                  onOpenPreview={(fid) => {
                    const file = nodes.find((n) => n.id === fid);
                    if (!file) return;
                    openSpecialTab(
                      {
                        id: `preview:${fid}`,
                        kind: 'preview',
                        fileId: fid,
                        title: `Preview ${file.name}`,
                      },
                      'secondary'
                    );
                  }}
                  onSplitEditor={handleToggleSplit}
                  onFormatDocument={handleFormatDocument}
                />
              </>
            )}
          </div>

          {/* Horizontal Resize Sash + Bottom Panel */}
          {panelVisible && (
            <>
              <div
                onMouseDown={() => {
                  resizingPanel.current = true;
                  document.body.style.cursor = 'row-resize';
                }}
                className="vscode-sash-h h-[3px] w-full shrink-0"
                style={{ backgroundColor: 'transparent' }}
              />
              <BottomPanel
                theme={theme}
                height={panelHeight}
                maximized={panelMaximized}
                activeTab={activeBottomTab}
                problems={diagnostics}
                outputLogs={outputLogs}
                debugLogs={debugLogs}
                terminals={terminals}
                activeTerminalId={activeTerminalId}
                nodes={nodes}
                gitChanges={gitChanges}
                commits={commits}
                onSelectTab={setActiveBottomTab}
                onToggleMaximize={() => setPanelMaximized((v) => !v)}
                onClose={() => setPanelVisible(false)}
                onJumpToProblem={(fid, ln) => openFile(fid, ln)}
                onRunTerminalCommand={handleRunTerminalCommand}
                onAddTerminal={() => {
                  const id = `term-${Date.now()}`;
                  setTerminals((prev) => [
                    ...prev,
                    {
                      id,
                      name: `bash (${prev.length + 1})`,
                      cwd: '/',
                      lines: [
                        { id: `i-${id}`, type: 'info', text: 'New terminal session ready.' },
                      ],
                      history: [],
                    },
                  ]);
                  setActiveTerminalId(id);
                }}
                onSelectTerminal={setActiveTerminalId}
                onDeleteTerminal={(id) => {
                  setTerminals((prev) => {
                    const next = prev.filter((t) => t.id !== id);
                    if (activeTerminalId === id && next[0]) {
                      setActiveTerminalId(next[0].id);
                    }
                    return next;
                  });
                }}
                onEvalDebugExpr={(expr) => {
                  try {
                    // eslint-disable-next-line no-eval
                    const res = (0, eval)(expr);
                    setDebugLogs((prev) => [
                      ...prev,
                      { id: `d-in-${Date.now()}`, type: 'log', text: `> ${expr}` },
                      {
                        id: `d-out-${Date.now()}`,
                        type: 'result',
                        text: typeof res === 'object' ? JSON.stringify(res) : String(res),
                      },
                    ]);
                  } catch (err) {
                    setDebugLogs((prev) => [
                      ...prev,
                      { id: `d-in-${Date.now()}`, type: 'log', text: `> ${expr}` },
                      {
                        id: `d-err-${Date.now()}`,
                        type: 'error',
                        text: err instanceof Error ? err.message : String(err),
                      },
                    ]);
                  }
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        theme={theme}
        branch={gitBranch}
        branches={branches}
        errorCount={errorCount}
        warningCount={warningCount}
        cursorLine={cursorPos.line}
        cursorCol={cursorPos.col}
        tabSize={settings.tabSize}
        language={activeFile?.language}
        prettierEnabled={prettierEnabled}
        notifications={notifications}
        onSwitchBranch={(b) => {
          setGitBranch(b);
          pushNotification(`Switched to branch '${b}'`, 'Git', 'info');
        }}
        onOpenProblems={() => {
          setPanelVisible(true);
          setActiveBottomTab('problems');
        }}
        onFormatDocument={() => handleFormatDocument()}
        onChangeLanguage={(lang: FileLanguage) => {
          if (!activeFile) return;
          setNodes((prev) =>
            prev.map((n) => (n.id === activeFile.id ? { ...n, language: lang } : n))
          );
        }}
        onOpenSettings={() =>
          openSpecialTab({ id: 'settings', kind: 'settings', title: 'Settings' })
        }
        onClearNotifications={() => setNotifications([])}
      />

      {/* Quick Open / Command Palette Modal */}
      <CommandPalette
        theme={theme}
        isOpen={paletteOpen}
        initialInput={paletteInitial}
        nodes={nodes}
        commands={commands}
        onClose={() => setPaletteOpen(false)}
        onSelectFile={(fid) => openFile(fid)}
        onSelectTheme={(tid: ThemeId) => setSettings((prev) => ({ ...prev, theme: tid }))}
      />

      {/* Supabase Cloud Sync & Account Modal */}
      <CloudAccountModal
        theme={theme}
        isOpen={cloudModalOpen}
        user={cloudUser}
        syncing={cloudSyncing}
        lastSyncedAt={lastSyncedAt}
        syncMode={syncMode}
        onClose={() => setCloudModalOpen(false)}
        onPushWorkspace={handlePushToCloud}
        onPullWorkspace={handlePullFromCloud}
      />
    </div>
  );
}
