import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import jsonWorker from 'monaco-editor/language/json/json.worker.js?worker';
import cssWorker from 'monaco-editor/language/css/css.worker.js?worker';
import htmlWorker from 'monaco-editor/language/html/html.worker.js?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker';
import { FileLanguage, FSNode, ThemeId } from '../types/ide';
import { THEMES } from '../data/themes';
import { getNodePath } from '../utils/fsHelpers';
import {
  registerMonacoLanguageProviders,
  updateProviderWorkspaceNodes,
} from './monacoProviders';

let initialized = false;

const AMBIENT_REACT_AND_WEB_LIBS = `
declare module 'react' {
  export function useState<T>(initial: T | (() => T)): [T, (val: T | ((prev: T) => T)) => void];
  export function useEffect(fn: () => void | (() => void), deps?: readonly any[]): void;
  export function useMemo<T>(fn: () => T, deps?: readonly any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: readonly any[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function useContext<T>(context: any): T;
  export function useReducer<S, A>(reducer: (s: S, a: A) => S, init: S): [S, (a: A) => void];
  export function createContext<T>(defaultValue: T): any;
  export type ReactNode = any;
  export type CSSProperties = Record<string, string | number>;
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => any;
  export type ChangeEvent<T = HTMLElement> = { target: T & { value: string; checked: boolean } };
  export type FormEvent<T = HTMLElement> = { preventDefault(): void; currentTarget: T };
  export type MouseEvent<T = HTMLElement> = { preventDefault(): void; stopPropagation(): void; currentTarget: T; clientX: number; clientY: number };
  export type KeyboardEvent<T = HTMLElement> = { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; preventDefault(): void; currentTarget: T };
  const React: {
    useState: typeof useState;
    useEffect: typeof useEffect;
    useMemo: typeof useMemo;
    useCallback: typeof useCallback;
    useRef: typeof useRef;
    useContext: typeof useContext;
    useReducer: typeof useReducer;
    createContext: typeof createContext;
    Fragment: any;
  };
  export default React;
}

declare namespace JSX {
  interface HTMLAttributes {
    id?: string;
    className?: string;
    style?: Record<string, string | number>;
    title?: string;
    role?: string;
    tabIndex?: number;
    hidden?: boolean;
    disabled?: boolean;
    placeholder?: string;
    type?: string;
    name?: string;
    value?: string | number | readonly string[];
    defaultValue?: string | number;
    checked?: boolean;
    href?: string;
    target?: string;
    rel?: string;
    src?: string;
    alt?: string;
    width?: string | number;
    height?: string | number;
    key?: string | number;
    ref?: any;
    children?: any;
    onClick?: (e: any) => void;
    onDoubleClick?: (e: any) => void;
    onChange?: (e: any) => void;
    onInput?: (e: any) => void;
    onSubmit?: (e: any) => void;
    onKeyDown?: (e: any) => void;
    onKeyUp?: (e: any) => void;
    onFocus?: (e: any) => void;
    onBlur?: (e: any) => void;
    onMouseEnter?: (e: any) => void;
    onMouseLeave?: (e: any) => void;
    [dataAttr: \`data-\${string}\`]: any;
    [ariaAttr: \`aria-\${string}\`]: any;
  }
  interface IntrinsicElements {
    div: HTMLAttributes;
    span: HTMLAttributes;
    p: HTMLAttributes;
    a: HTMLAttributes;
    button: HTMLAttributes;
    input: HTMLAttributes;
    textarea: HTMLAttributes;
    select: HTMLAttributes;
    option: HTMLAttributes;
    form: HTMLAttributes;
    label: HTMLAttributes;
    ul: HTMLAttributes;
    ol: HTMLAttributes;
    li: HTMLAttributes;
    h1: HTMLAttributes;
    h2: HTMLAttributes;
    h3: HTMLAttributes;
    h4: HTMLAttributes;
    h5: HTMLAttributes;
    h6: HTMLAttributes;
    header: HTMLAttributes;
    footer: HTMLAttributes;
    main: HTMLAttributes;
    section: HTMLAttributes;
    article: HTMLAttributes;
    aside: HTMLAttributes;
    nav: HTMLAttributes;
    img: HTMLAttributes;
    svg: HTMLAttributes;
    path: HTMLAttributes;
    table: HTMLAttributes;
    thead: HTMLAttributes;
    tbody: HTMLAttributes;
    tr: HTMLAttributes;
    th: HTMLAttributes;
    td: HTMLAttributes;
    code: HTMLAttributes;
    pre: HTMLAttributes;
    [elemName: string]: any;
  }
}
`;

export function ensureMonacoInitialized() {
  if (initialized) return;
  initialized = true;

  (self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
    getWorker(_: string, label: string) {
      if (label === 'json') return new jsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
      if (label === 'typescript' || label === 'javascript') return new tsWorker();
      return new editorWorker();
    },
  };

  const sharedCompilerOptions: monaco.typescript.CompilerOptions = {
    target: monaco.typescript.ScriptTarget.ESNext,
    module: monaco.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.typescript.JsxEmit.ReactJSX,
    allowJs: true,
    checkJs: false,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    strict: false,
    noEmit: true,
  };

  // Configure TypeScript & JavaScript IntelliSense with eager cross-file sync
  const tsDefaults = monaco.typescript.typescriptDefaults;
  tsDefaults.setCompilerOptions(sharedCompilerOptions);
  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  tsDefaults.setEagerModelSync(true);
  tsDefaults.addExtraLib(
    AMBIENT_REACT_AND_WEB_LIBS,
    'file:///node_modules/@types/react/index.d.ts'
  );

  const jsDefaults = monaco.typescript.javascriptDefaults;
  jsDefaults.setCompilerOptions(sharedCompilerOptions);
  jsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  jsDefaults.setEagerModelSync(true);
  jsDefaults.addExtraLib(
    AMBIENT_REACT_AND_WEB_LIBS,
    'file:///node_modules/@types/react/index.d.ts'
  );

  // Register custom Emmet, Snippets, Python IntelliSense & Formatters
  registerMonacoLanguageProviders();

  // Register all 6 workbench themes into Monaco
  (Object.keys(THEMES) as ThemeId[]).forEach((themeId) => {
    const t = THEMES[themeId];
    const stripHash = (hex: string) => hex.replace('#', '');
    monaco.editor.defineTheme(`vscode-${themeId}`, {
      base: t.isDark ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: stripHash(t.tokens.comment), fontStyle: 'italic' },
        { token: 'keyword', foreground: stripHash(t.tokens.keyword) },
        { token: 'keyword.control', foreground: stripHash(t.tokens.control) },
        { token: 'string', foreground: stripHash(t.tokens.string) },
        { token: 'number', foreground: stripHash(t.tokens.number) },
        { token: 'type', foreground: stripHash(t.tokens.type) },
        { token: 'type.identifier', foreground: stripHash(t.tokens.type) },
        { token: 'identifier', foreground: stripHash(t.tokens.variable) },
        { token: 'delimiter', foreground: stripHash(t.tokens.punctuation) },
        { token: 'tag', foreground: stripHash(t.tokens.tag) },
        { token: 'attribute.name', foreground: stripHash(t.tokens.attribute) },
        { token: 'attribute.value', foreground: stripHash(t.tokens.string) },
      ],
      colors: {
        'editor.background': t.colors.editorBg,
        'editor.foreground': t.colors.editorFg,
        'editorGutter.background': t.colors.editorGutterBg,
        'editorLineNumber.foreground': t.colors.editorLineNumberFg,
        'editorLineNumber.activeForeground': t.colors.editorActiveLineNumberFg,
        'editor.lineHighlightBackground': t.isDark ? '#ffffff0a' : '#00000008',
        'editor.selectionBackground': t.isDark ? '#264f78' : '#add6ff',
        'editorCursor.foreground': t.isDark ? '#aeafad' : '#000000',
        'editorIndentGuide.background': t.isDark ? '#404040' : '#d3d3d3',
        'editorIndentGuide.activeBackground': t.isDark ? '#707070' : '#939393',
      },
    });
  });
}

export function mapToMonacoLanguage(lang?: FileLanguage): string {
  switch (lang) {
    case 'typescript':
    case 'tsx':
      return 'typescript';
    case 'javascript':
    case 'jsx':
      return 'javascript';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'markdown':
      return 'markdown';
    case 'python':
      return 'python';
    default:
      return 'plaintext';
  }
}

export function syncWorkspaceModels(nodes: FSNode[]) {
  ensureMonacoInitialized();
  updateProviderWorkspaceNodes(nodes);
  const activeUris = new Set<string>();
  const editors = monaco.editor.getEditors();

  for (const node of nodes) {
    if (node.type !== 'file') continue;
    const relPath = getNodePath(nodes, node.id);
    const uri = monaco.Uri.parse(`file:///${relPath}`);
    activeUris.add(uri.toString());

    const monacoLang = mapToMonacoLanguage(node.language);
    let model = monaco.editor.getModel(uri);
    const content = node.content ?? '';

    if (!model) {
      model = monaco.editor.createModel(content, monacoLang, uri);
    } else {
      if (model.getLanguageId() !== monacoLang) {
        monaco.editor.setModelLanguage(model, monacoLang);
      }
      const isActivelyFocused = editors.some(
        (ed) => ed.getModel() === model && ed.hasTextFocus()
      );
      if (!isActivelyFocused && model.getValue() !== content) {
        model.setValue(content);
      }
    }
  }

  // Clean up deleted models
  for (const model of monaco.editor.getModels()) {
    const uriStr = model.uri.toString();
    if (uriStr.startsWith('file:///') && !uriStr.includes('node_modules') && !activeUris.has(uriStr)) {
      model.dispose();
    }
  }
}
