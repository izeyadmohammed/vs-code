import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { FileLanguage, ThemeConfig } from '../types/ide';
import { ensureMonacoInitialized, mapToMonacoLanguage } from '../lib/monacoSetup';

interface DiffViewerProps {
  theme: ThemeConfig;
  fileName: string;
  language: FileLanguage;
  originalContent: string;
  modifiedContent: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  theme,
  fileName,
  language,
  originalContent,
  modifiedContent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const c = theme.colors;

  useEffect(() => {
    ensureMonacoInitialized();
    if (!containerRef.current) return;

    const monacoLang = mapToMonacoLanguage(language);
    const originalModel = monaco.editor.createModel(originalContent, monacoLang);
    const modifiedModel = monaco.editor.createModel(modifiedContent, monacoLang);

    const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
      theme: `vscode-${theme.id}`,
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: 13,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
    });

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel,
    });

    diffEditorRef.current = diffEditor;

    return () => {
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
      diffEditorRef.current = null;
    };
  }, [fileName, language, originalContent, modifiedContent, theme.id]);

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: c.editorBg, color: c.editorFg }}
    >
      <div
        className="h-[28px] px-4 flex items-center justify-between text-[11px] border-b shrink-0"
        style={{ borderColor: c.tabBorder, backgroundColor: c.tabBarBg }}
      >
        <span className="opacity-75">HEAD: {fileName} (Original)</span>
        <span className="opacity-75">Working Tree: {fileName} (Modified)</span>
      </div>
      <div ref={containerRef} className="flex-1 w-full overflow-hidden" />
    </div>
  );
};
