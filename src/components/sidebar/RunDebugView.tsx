import React from 'react';
import { Play, Eye, Trash2, CircleDot } from 'lucide-react';
import { FSNode, ThemeConfig } from '../../types/ide';
import { getNodePath } from '../../utils/fsHelpers';

interface RunDebugViewProps {
  theme: ThemeConfig;
  activeFile?: FSNode;
  nodes: FSNode[];
  breakpoints: Record<string, number[]>;
  onRunActiveFile: () => void;
  onOpenPreview: () => void;
  onRemoveBreakpoint: (fileId: string, line: number) => void;
  onJumpToLine: (fileId: string, line: number) => void;
}

export const RunDebugView: React.FC<RunDebugViewProps> = ({
  theme,
  activeFile,
  nodes,
  breakpoints,
  onRunActiveFile,
  onOpenPreview,
  onRemoveBreakpoint,
  onJumpToLine,
}) => {
  const c = theme.colors;

  const bpEntries = Object.entries(breakpoints).flatMap(([fileId, lines]) => {
    const file = nodes.find((n) => n.id === fileId);
    if (!file) return [];
    const path = getNodePath(nodes, fileId);
    return lines.map((line) => ({ fileId, path, name: file.name, line }));
  });

  const canRunJs =
    activeFile?.language === 'javascript' || activeFile?.language === 'typescript';
  const canPreview =
    activeFile?.language === 'html' || activeFile?.language === 'markdown';

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <div className="p-3 space-y-2 border-b" style={{ borderColor: c.sidebarBorder }}>
        <button
          type="button"
          disabled={!canRunJs}
          onClick={onRunActiveFile}
          className="w-full h-[30px] rounded-[2px] text-[12px] font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-45"
          style={{
            backgroundColor: c.buttonBg,
            color: c.buttonFg,
          }}
        >
          <Play size={13} />
          <span>{canRunJs ? `Run ${activeFile?.name}` : 'Run Active JS/TS File'}</span>
        </button>

        {canPreview && (
          <button
            type="button"
            onClick={onOpenPreview}
            className="w-full h-[28px] rounded-[2px] text-[12px] font-medium flex items-center justify-center gap-2 hover:bg-white/10"
            style={{
              border: `1px solid ${c.inputBorder}`,
              color: c.sidebarFg,
            }}
          >
            <Eye size={13} />
            <span>Open Live Preview</span>
          </button>
        )}

        <p className="text-[11px] opacity-65 leading-relaxed">
          Click the left gutter next to any line number in the editor to toggle breakpoints. Output prints directly to the Debug Console.
        </p>
      </div>

      {/* Breakpoints Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold tracking-wide flex items-center justify-between opacity-80 border-b" style={{ borderColor: c.sidebarBorder }}>
          <span>BREAKPOINTS</span>
          <span className="tabular-nums">{bpEntries.length}</span>
        </div>

        {bpEntries.length === 0 ? (
          <div className="px-3 py-3 text-[12px] opacity-60">
            No breakpoints set.
          </div>
        ) : (
          bpEntries.map((bp) => (
            <div
              key={`${bp.fileId}-${bp.line}`}
              className="h-[24px] px-3 flex items-center justify-between text-[12px] hover:bg-white/5 group cursor-pointer"
              onClick={() => onJumpToLine(bp.fileId, bp.line)}
            >
              <span className="flex items-center gap-2 min-w-0 truncate">
                <CircleDot size={12} className="text-red-500 shrink-0" />
                <span className="truncate">{bp.name}</span>
                <span className="text-[11px] opacity-55 truncate">{bp.path}</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-mono opacity-65 tabular-nums">
                  Ln {bp.line}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBreakpoint(bp.fileId, bp.line);
                  }}
                  className="opacity-0 group-hover:opacity-80 hover:!opacity-100 p-0.5"
                  aria-label="Remove breakpoint"
                >
                  <Trash2 size={11} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
