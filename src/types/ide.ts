export type FileLanguage =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'jsx'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown'
  | 'python'
  | 'plaintext';

export interface FSNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  content?: string;
  language?: FileLanguage;
  isOpen?: boolean; // for folders in explorer
  updatedAt?: number;
}

export type ActivityView = 'explorer' | 'search' | 'git' | 'debug' | 'extensions';

export type BottomTab = 'problems' | 'output' | 'debug' | 'terminal';

export type ThemeId =
  | 'dark-modern'
  | 'dark-plus'
  | 'light-modern'
  | 'monokai'
  | 'github-dark'
  | 'dracula';

export interface ThemeTokens {
  keyword: string;
  control: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  type: string;
  variable: string;
  operator: string;
  tag: string;
  attribute: string;
  property: string;
  punctuation: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  isDark: boolean;
  colors: {
    titleBarBg: string;
    titleBarFg: string;
    titleBarBorder: string;
    activityBarBg: string;
    activityBarFg: string;
    activityBarInactiveFg: string;
    activityBarIndicator: string;
    activityBarBorder: string;
    sidebarBg: string;
    sidebarFg: string;
    sidebarBorder: string;
    sidebarSectionBg: string;
    editorBg: string;
    editorFg: string;
    editorGutterBg: string;
    editorLineNumberFg: string;
    editorActiveLineNumberFg: string;
    editorActiveLineBg: string;
    editorSelectionBg: string;
    tabBarBg: string;
    tabActiveBg: string;
    tabActiveFg: string;
    tabInactiveBg: string;
    tabInactiveFg: string;
    tabBorder: string;
    tabActiveBorderTop: string;
    panelBg: string;
    panelFg: string;
    panelBorder: string;
    statusBarBg: string;
    statusBarFg: string;
    statusBarBorder: string;
    inputBg: string;
    inputFg: string;
    inputBorder: string;
    focusBorder: string;
    listHoverBg: string;
    listActiveBg: string;
    listActiveFg: string;
    buttonBg: string;
    buttonFg: string;
    buttonHoverBg: string;
    dropdownBg: string;
    dropdownBorder: string;
    badgeBg: string;
    badgeFg: string;
    accent: string;
  };
  tokens: ThemeTokens;
}

export interface EditorTab {
  id: string; // e.g., fileId or 'welcome' or 'settings' or 'diff:fileId'
  kind: 'file' | 'welcome' | 'settings' | 'diff' | 'preview';
  fileId?: string;
  title: string;
}

export interface EditorSettings {
  theme: ThemeId;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  formatOnSave: boolean;
  renderWhitespace: boolean;
}

export interface GitCommit {
  id: string;
  hash: string;
  message: string;
  author: string;
  timestamp: number;
  filesChanged: number;
  snapshot: Record<string, string>; // path -> content
}

export interface ExtensionItem {
  id: string;
  name: string;
  publisher: string;
  description: string;
  version: string;
  downloads: string;
  rating: number;
  category: string;
  installed: boolean;
  enabled: boolean;
  iconColor: string;
  shortTag: string;
}

export interface DiagnosticItem {
  id: string;
  fileId: string;
  filePath: string;
  line: number;
  col: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  source: string;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source: string;
  timestamp: number;
}

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  lines: Array<{
    id: string;
    type: 'input' | 'output' | 'error' | 'info' | 'success';
    text: string;
  }>;
  history: string[];
}
