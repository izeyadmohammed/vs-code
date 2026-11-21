import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  XCircle,
  AlertTriangle,
  Info,
  TerminalSquare,
} from 'lucide-react';
import {
  BottomTab,
  DiagnosticItem,
  FSNode,
  GitCommit,
  TerminalSession,
  ThemeConfig,
} from '../types/ide';
import { GitChangeItem } from './sidebar/SourceControlView';

interface BottomPanelProps {
  theme: ThemeConfig;
  height: number;
  maximized: boolean;
  activeTab: BottomTab;
  problems: DiagnosticItem[];
  outputLogs: string[];
  debugLogs: Array<{ id: string; type: 'log' | 'error' | 'result'; text: string }>;
  terminals: TerminalSession[];
  activeTerminalId: string;
  nodes: FSNode[];
  gitChanges: GitChangeItem[];
  commits: GitCommit[];
  onSelectTab: (tab: BottomTab) => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onJumpToProblem: (fileId: string, line: number) => void;
  onRunTerminalCommand: (sessionId: string, command: string) => void;
  onAddTerminal: () => void;
  onSelectTerminal: (id: string) => void;
  onDeleteTerminal: (id: string) => void;
  onEvalDebugExpr: (expr: string) => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  theme,
  height,
  maximized,
  activeTab,
  problems,
  outputLogs,
  debugLogs,
  terminals,
  activeTerminalId,
  onSelectTab,
  onToggleMaximize,
  onClose,
  onJumpToProblem,
  onRunTerminalCommand,
  onAddTerminal,
  onSelectTerminal,
  onDeleteTerminal,
  onEvalDebugExpr,
}) => {
  const [termInput, setTermInput] = useState('');
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [debugInput, setDebugInput] = useState('');

  const termScrollRef = useRef<HTMLDivElement>(null);
  const termInputRef = useRef<HTMLInputElement>(null);
  const debugScrollRef = useRef<HTMLDivElement>(null);

  const activeTerminal = terminals.find((t) => t.id === activeTerminalId) || terminals[0];

  useEffect(() => {
    if (activeTab === 'terminal' && termScrollRef.current) {
      termScrollRef.current.scrollTop = termScrollRef.current.scrollHeight;
    }
  }, [activeTab, activeTerminal?.lines.length]);

  useEffect(() => {
    if (activeTab === 'debug' && debugScrollRef.current) {
      debugScrollRef.current.scrollTop = debugScrollRef.current.scrollHeight;
    }
  }, [activeTab, debugLogs.length]);

  const c = theme.colors;

  const tabs: Array<{ id: BottomTab; label: string; badge?: number }> = [
    { id: 'problems', label: 'PROBLEMS', badge: problems.length },
    { id: 'output', label: 'OUTPUT' },
    { id: 'debug', label: 'DEBUG CONSOLE' },
    { id: 'terminal', label: 'TERMINAL' },
  ];

  return (
    <section
      style={{
        height: maximized ? '68vh' : `${height}px`,
        backgroundColor: c.panelBg,
        color: c.panelFg,
        borderTop: `1px solid ${c.panelBorder}`,
      }}
      className="w-full flex flex-col shrink-0 overflow-hidden"
      aria-label="Bottom Panel"
    >
      {/* Panel Header */}
      <div className="h-[34px] px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-5 h-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className="relative h-full flex items-center gap-1.5 text-[11px] font-medium tracking-wide transition-colors whitespace-nowrap"
                style={{
                  color: isActive ? c.tabActiveFg : c.tabInactiveFg,
                }}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className="px-1.5 py-[1px] rounded-full text-[10px] tabular-nums"
                    style={{ backgroundColor: c.badgeBg, color: c.badgeFg }}
                  >
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[1.5px]"
                    style={{ backgroundColor: c.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          {activeTab === 'terminal' && (
            <button
              type="button"
              onClick={onAddTerminal}
              className="p-1 rounded hover:bg-white/10"
              title="New Terminal"
              aria-label="New Terminal"
            >
              <Plus size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleMaximize}
            className="p-1 rounded hover:bg-white/10"
            title={maximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
            aria-label="Toggle Maximize Panel"
          >
            {maximized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10"
            title="Close Panel (Ctrl+J)"
            aria-label="Close Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {activeTab === 'problems' && (
          <div className="flex-1 overflow-y-auto px-4 py-2 text-[12px]">
            {problems.length === 0 ? (
              <div className="opacity-65 py-2">No problems have been detected in the workspace.</div>
            ) : (
              problems.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onJumpToProblem(p.fileId, p.line)}
                  className="w-full py-1.5 px-2 rounded flex items-center gap-2.5 text-left hover:bg-white/5"
                >
                  {p.severity === 'error' ? (
                    <XCircle size={14} className="text-red-400 shrink-0" />
                  ) : p.severity === 'warning' ? (
                    <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                  ) : (
                    <Info size={14} className="text-sky-400 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{p.message}</span>
                  <span className="text-[11px] opacity-60 font-mono shrink-0">
                    {p.filePath} [{p.line}, {p.col}]
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'output' && (
          <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[12px] space-y-1">
            {outputLogs.map((log, i) => (
              <div key={i} className="opacity-85 whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'debug' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={debugScrollRef} className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[12px] space-y-1">
              {debugLogs.length === 0 ? (
                <div className="opacity-55">
                  Debug Console ready. Run a JS file or evaluate a JavaScript expression below.
                </div>
              ) : (
                debugLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className="whitespace-pre-wrap"
                    style={{
                      color:
                        entry.type === 'error'
                          ? '#f87171'
                          : entry.type === 'result'
                          ? '#60a5fa'
                          : c.panelFg,
                    }}
                  >
                    {entry.text}
                  </div>
                ))
              )}
            </div>
            <div
              className="h-[28px] px-3 flex items-center gap-2 border-t font-mono text-[12px]"
              style={{ borderColor: c.panelBorder }}
            >
              <span style={{ color: c.accent }}>&gt;</span>
              <input
                type="text"
                value={debugInput}
                onChange={(e) => setDebugInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && debugInput.trim()) {
                    onEvalDebugExpr(debugInput.trim());
                    setDebugInput('');
                  }
                }}
                placeholder="Evaluate expression..."
                className="flex-1 bg-transparent outline-none"
                style={{ color: c.panelFg }}
              />
            </div>
          </div>
        )}

        {activeTab === 'terminal' && activeTerminal && (
          <div className="flex-1 flex overflow-hidden">
            {/* Terminal Output & Prompt */}
            <div
              ref={termScrollRef}
              onClick={() => termInputRef.current?.focus()}
              className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[12.5px] leading-[1.55] cursor-text"
            >
              {activeTerminal.lines.map((line) => (
                <div
                  key={line.id}
                  className="whitespace-pre-wrap break-words"
                  style={{
                    color:
                      line.type === 'error'
                        ? '#f87171'
                        : line.type === 'success'
                        ? '#4ade80'
                        : line.type === 'info'
                        ? '#60a5fa'
                        : c.panelFg,
                  }}
                >
                  {line.text}
                </div>
              ))}

              <div className="flex items-center gap-2 mt-0.5">
                <span className="shrink-0 font-semibold" style={{ color: '#4ade80' }}>
                  dev@vscode
                </span>
                <span className="shrink-0 opacity-70">:</span>
                <span className="shrink-0 font-semibold" style={{ color: '#60a5fa' }}>
                  ~{activeTerminal.cwd === '/' ? '' : activeTerminal.cwd}
                </span>
                <span className="shrink-0">$</span>
                <input
                  ref={termInputRef}
                  type="text"
                  value={termInput}
                  onChange={(e) => setTermInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRunTerminalCommand(activeTerminal.id, termInput);
                      setTermInput('');
                      setHistoryIdx(-1);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const hist = activeTerminal.history;
                      if (hist.length === 0) return;
                      const nextIdx = historyIdx === -1 ? hist.length - 1 : Math.max(0, historyIdx - 1);
                      setHistoryIdx(nextIdx);
                      setTermInput(hist[nextIdx]);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const hist = activeTerminal.history;
                      if (historyIdx === -1) return;
                      if (historyIdx + 1 >= hist.length) {
                        setHistoryIdx(-1);
                        setTermInput('');
                      } else {
                        const nextIdx = historyIdx + 1;
                        setHistoryIdx(nextIdx);
                        setTermInput(hist[nextIdx]);
                      }
                    }
                  }}
                  className="flex-1 bg-transparent outline-none min-w-0"
                  style={{ color: c.panelFg }}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Right Terminal Instances Switcher */}
            <div
              className="hidden sm:flex w-[140px] flex-col border-l py-1 shrink-0 select-none"
              style={{ borderColor: c.panelBorder }}
            >
              {terminals.map((term) => {
                const isSel = term.id === activeTerminal.id;
                return (
                  <div
                    key={term.id}
                    onClick={() => onSelectTerminal(term.id)}
                    className="h-[24px] px-2.5 flex items-center justify-between text-[12px] cursor-pointer group"
                    style={{
                      backgroundColor: isSel ? c.listActiveBg : 'transparent',
                      color: isSel ? c.listActiveFg : c.panelFg,
                    }}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <TerminalSquare size={12} />
                      <span className="truncate">{term.name}</span>
                    </span>
                    {terminals.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTerminal(term.id);
                        }}
                        className="opacity-0 group-hover:opacity-80 hover:!opacity-100"
                        title="Kill Terminal"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
