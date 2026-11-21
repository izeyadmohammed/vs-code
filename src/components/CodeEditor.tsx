import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { EditorSettings, FileLanguage, ThemeConfig } from '../types/ide';
import { ensureMonacoInitialized, mapToMonacoLanguage } from '../lib/monacoSetup';
import { isVoidHtmlTag } from '../lib/monacoProviders';

interface CodeEditorProps {
  fileId: string;
  filePath: string;
  content: string;
  language: FileLanguage;
  theme: ThemeConfig;
  settings: EditorSettings;
  breakpoints: number[];
  jumpToLine?: { line: number; nonce: number } | null;
  findTriggerNonce?: number;
  onChange: (newContent: string) => void;
  onSave: () => void;
  onCursorChange: (line: number, col: number) => void;
  onToggleBreakpoint: (line: number) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  fileId,
  filePath,
  content,
  language,
  theme,
  settings,
  breakpoints,
  jumpToLine,
  findTriggerNonce,
  onChange,
  onSave,
  onCursorChange,
  onToggleBreakpoint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const onCursorRef = useRef(onCursorChange);
  const onToggleBpRef = useRef(onToggleBreakpoint);
  const suppressChangeRef = useRef(false);

  onChangeRef.current = onChange;
  onSaveRef.current = onSave;
  onCursorRef.current = onCursorChange;
  onToggleBpRef.current = onToggleBreakpoint;

  useEffect(() => {
    ensureMonacoInitialized();
    if (!containerRef.current) return;

    const uri = monaco.Uri.parse(`file:///${filePath}`);
    let model = monaco.editor.getModel(uri);
    const monacoLang = mapToMonacoLanguage(language);
    if (!model) {
      model = monaco.editor.createModel(content, monacoLang, uri);
    }

    const editor = monaco.editor.create(containerRef.current, {
      model,
      theme: `vscode-${theme.id}`,
      fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontLigatures: true,
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap ? 'on' : 'off',
      minimap: { enabled: settings.minimap },
      lineNumbers: settings.lineNumbers ? 'on' : 'off',
      automaticLayout: true,
      glyphMargin: true,
      folding: true,
      bracketPairColorization: { enabled: true },
      guides: { indentation: true, bracketPairs: true },
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      renderWhitespace: settings.renderWhitespace ? 'all' : 'selection',
      scrollBeyondLastLine: false,
      padding: { top: 8, bottom: 16 },
      // Real VS Code IntelliSense & Assistance Options
      quickSuggestions: { other: 'on', comments: 'off', strings: 'on' },
      quickSuggestionsDelay: 50,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      acceptSuggestionOnCommitCharacter: true,
      tabCompletion: 'on',
      snippetSuggestions: 'top',
      wordBasedSuggestions: 'matchingDocuments',
      parameterHints: { enabled: true, cycle: true },
      hover: { enabled: 'on', delay: 200 },
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoClosingDelete: 'always',
      autoSurround: 'languageDefined',
      autoIndent: 'full',
      formatOnType: true,
      formatOnPaste: true,
      linkedEditing: true,
      matchBrackets: 'always',
      occurrencesHighlight: 'singleFile',
      selectionHighlight: true,
      suggestSelection: 'first',
      suggest: {
        snippetsPreventQuickSuggestions: false,
        showIcons: true,
        preview: false,
        filterGraceful: true,
      },
    });

    editorRef.current = editor;
    decorationsRef.current = editor.createDecorationsCollection([]);

    // Ctrl+S / Cmd+S inside Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current();
    });

    // Shift+Alt+F Format Document inside Monaco
    editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      () => {
        editor.getAction('editor.action.formatDocument')?.run();
      }
    );

    // Auto-close HTML & JSX tags when typing '>' + smart Enter between tags
    const changeSub = editor.onDidChangeModelContent((e) => {
      if (suppressChangeRef.current) return;

      const activeModel = editor.getModel();
      if (activeModel && e.changes.length === 1) {
        const change = e.changes[0];
        const langId = activeModel.getLanguageId();
        const supportsTags =
          langId === 'html' || langId === 'typescript' || langId === 'javascript';

        if (supportsTags && change.text === '>') {
          const line = change.range.startLineNumber;
          const colAfter = change.range.startColumn + 1;
          const textBefore = activeModel.getValueInRange({
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: colAfter,
          });
          const textAfter = activeModel.getValueInRange({
            startLineNumber: line,
            startColumn: colAfter,
            endLineNumber: line,
            endColumn: Math.min(colAfter + 20, activeModel.getLineMaxColumn(line)),
          });

          // Match opening tag like <div>, <Button className="x">, ignoring </close>, <br/>, =>, and generics like Array<T>
          const tagMatch = textBefore.match(/<([a-zA-Z][\w.-]*)(?:\s+[^<>]*?)?>$/);
          if (
            tagMatch &&
            !textBefore.endsWith('/>') &&
            !textBefore.endsWith('=>') &&
            !textAfter.startsWith(`</${tagMatch[1]}>`)
          ) {
            const tagName = tagMatch[1];
            const isLikelyHtmlOrJsx =
              langId === 'html' ||
              activeModel.uri.path.endsWith('.tsx') ||
              activeModel.uri.path.endsWith('.jsx') ||
              /^[a-z]+$/.test(tagName);
            const isTsGenericLookalike =
              (langId === 'typescript' || langId === 'javascript') &&
              /[a-zA-Z0-9_$\])]$/.test(
                textBefore.slice(0, textBefore.length - tagMatch[0].length)
              );

            if (isLikelyHtmlOrJsx && !isTsGenericLookalike && !isVoidHtmlTag(tagName)) {
              const closeTag = `</${tagName}>`;
              suppressChangeRef.current = true;
              activeModel.pushEditOperations(
                [],
                [
                  {
                    range: new monaco.Range(line, colAfter, line, colAfter),
                    text: closeTag,
                  },
                ],
                () => [new monaco.Selection(line, colAfter, line, colAfter)]
              );
              editor.setPosition({ lineNumber: line, column: colAfter });
              suppressChangeRef.current = false;
            }
          }
        } else if (supportsTags && /^\r?\n[ \t]*$/.test(change.text)) {
          // Smart Enter between <tag> and </tag> -> indent inner line and place </tag> on next line
          const openLineNum = change.range.startLineNumber;
          const nextLineNum = openLineNum + 1;
          if (nextLineNum <= activeModel.getLineCount()) {
            const openLineText = activeModel.getLineContent(openLineNum);
            const nextLineText = activeModel.getLineContent(nextLineNum);
            const openMatch = openLineText.match(/^([ \t]*).*<([a-zA-Z][\w.-]*)(?:\s+[^<>]*?)?>\s*$/);
            const closeMatch = nextLineText.match(/^[ \t]*<\/([a-zA-Z][\w.-]*)>/);
            if (
              openMatch &&
              closeMatch &&
              openMatch[2] === closeMatch[1] &&
              !openLineText.trim().endsWith('/>')
            ) {
              const baseIndent = openMatch[1];
              const modelOpts = activeModel.getOptions();
              const indentUnit = modelOpts.insertSpaces
                ? ' '.repeat(modelOpts.tabSize)
                : '\t';
              const innerIndent = baseIndent + indentUnit;
              const closingOffset = nextLineText.indexOf(`</${closeMatch[1]}>`);
              suppressChangeRef.current = true;
              activeModel.pushEditOperations(
                [],
                [
                  {
                    range: new monaco.Range(
                      nextLineNum,
                      1,
                      nextLineNum,
                      closingOffset + 1
                    ),
                    text: `${innerIndent}\n${baseIndent}`,
                  },
                ],
                () => [
                  new monaco.Selection(
                    nextLineNum,
                    innerIndent.length + 1,
                    nextLineNum,
                    innerIndent.length + 1
                  ),
                ]
              );
              editor.setPosition({
                lineNumber: nextLineNum,
                column: innerIndent.length + 1,
              });
              suppressChangeRef.current = false;
            }
          }
        }
      }

      const val = editor.getValue();
      onChangeRef.current(val);
    });

    const cursorSub = editor.onDidChangeCursorPosition((e) => {
      onCursorRef.current(e.position.lineNumber, e.position.column);
    });

    const mouseSub = editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position?.lineNumber;
        if (line) onToggleBpRef.current(line);
      }
    });

    return () => {
      changeSub.dispose();
      cursorSub.dispose();
      mouseSub.dispose();
      editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch active file model when fileId or filePath changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const uri = monaco.Uri.parse(`file:///${filePath}`);
    let model = monaco.editor.getModel(uri);
    const monacoLang = mapToMonacoLanguage(language);

    if (!model) {
      model = monaco.editor.createModel(content, monacoLang, uri);
    } else {
      if (model.getLanguageId() !== monacoLang) {
        monaco.editor.setModelLanguage(model, monacoLang);
      }
      if (!editor.hasTextFocus() && model.getValue() !== content) {
        suppressChangeRef.current = true;
        model.setValue(content);
        suppressChangeRef.current = false;
      }
    }

    if (editor.getModel() !== model) {
      editor.setModel(model);
    }

    const pos = editor.getPosition();
    if (pos) {
      onCursorRef.current(pos.lineNumber, pos.column);
    }
  }, [fileId, filePath, language, content]);

  // Sync theme & settings
  useEffect(() => {
    monaco.editor.setTheme(`vscode-${theme.id}`);
  }, [theme.id]);

  useEffect(() => {
    editorRef.current?.updateOptions({
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap ? 'on' : 'off',
      minimap: { enabled: settings.minimap },
      lineNumbers: settings.lineNumbers ? 'on' : 'off',
      renderWhitespace: settings.renderWhitespace ? 'all' : 'selection',
    });
  }, [settings]);

  // Sync breakpoint glyph decorations
  useEffect(() => {
    if (!decorationsRef.current) return;
    decorationsRef.current.set(
      breakpoints.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'monaco-breakpoint-glyph',
          glyphMarginHoverMessage: { value: `Breakpoint at line ${line}` },
        },
      }))
    );
  }, [breakpoints, fileId]);

  // Jump to line
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !jumpToLine) return;
    editor.revealLineInCenter(jumpToLine.line);
    editor.setPosition({ lineNumber: jumpToLine.line, column: 1 });
    editor.focus();
  }, [jumpToLine?.nonce, jumpToLine?.line, fileId]);

  // Trigger Find widget
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !findTriggerNonce) return;
    editor.focus();
    editor.getAction('actions.find')?.run();
  }, [findTriggerNonce]);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full overflow-hidden"
      style={{ backgroundColor: theme.colors.editorBg }}
    />
  );
};
