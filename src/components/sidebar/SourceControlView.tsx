import React, { useState } from 'react';
import { Check, Undo2, GitCommitHorizontal, Plus } from 'lucide-react';
import { FSNode, GitCommit, ThemeConfig } from '../../types/ide';
import { FileIcon } from '../FileIcon';

export interface GitChangeItem {
  fileId: string;
  path: string;
  name: string;
  status: 'M' | 'U';
}

interface SourceControlViewProps {
  theme: ThemeConfig;
  branch: string;
  changes: GitChangeItem[];
  stagedIds: Set<string>;
  commits: GitCommit[];
  nodes: FSNode[];
  onToggleStage: (fileId: string) => void;
  onStageAll: () => void;
  onDiscardChange: (fileId: string) => void;
  onCommit: (message: string) => void;
  onOpenDiff: (fileId: string) => void;
}

export const SourceControlView: React.FC<SourceControlViewProps> = ({
  theme,
  branch,
  changes,
  stagedIds,
  commits,
  nodes,
  onToggleStage,
  onStageAll,
  onDiscardChange,
  onCommit,
  onOpenDiff,
}) => {
  const [commitMsg, setCommitMsg] = useState('');
  const c = theme.colors;

  const stagedChanges = changes.filter((ch) => stagedIds.has(ch.fileId));
  const unstagedChanges = changes.filter((ch) => !stagedIds.has(ch.fileId));

  const handleCommit = () => {
    if (!commitMsg.trim() || changes.length === 0) return;
    onCommit(commitMsg.trim());
    setCommitMsg('');
  };

  const renderChangeRow = (ch: GitChangeItem, isStaged: boolean) => {
    const fileNode = nodes.find((n) => n.id === ch.fileId);
    return (
      <div
        key={ch.fileId}
        className="h-[24px] px-3 flex items-center justify-between text-[12px] group hover:bg-white/5 cursor-pointer"
        onClick={() => onOpenDiff(ch.fileId)}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          <FileIcon name={ch.name} language={fileNode?.language} size={13} />
          <span className="truncate">{ch.name}</span>
          <span className="text-[11px] opacity-50 truncate">{ch.path}</span>
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {!isStaged && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDiscardChange(ch.fileId);
              }}
              className="opacity-0 group-hover:opacity-80 hover:!opacity-100 p-0.5 rounded hover:bg-white/10"
              title="Discard Changes"
              aria-label={`Discard changes to ${ch.name}`}
            >
              <Undo2 size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStage(ch.fileId);
            }}
            className="opacity-0 group-hover:opacity-80 hover:!opacity-100 p-0.5 rounded hover:bg-white/10"
            title={isStaged ? 'Unstage Changes' : 'Stage Changes'}
          >
            {isStaged ? <span className="font-mono text-[12px]">−</span> : <Plus size={12} />}
          </button>
          <span
            className="font-mono text-[11px] font-semibold w-3 text-center"
            style={{ color: ch.status === 'M' ? '#e2c08d' : '#73c991' }}
          >
            {ch.status}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Commit Box */}
      <div className="p-2.5 space-y-2 border-b" style={{ borderColor: c.sidebarBorder }}>
        <textarea
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              handleCommit();
            }
          }}
          rows={2}
          placeholder={`Message (Ctrl+Enter to commit on '${branch}')`}
          className="w-full p-2 text-[12px] rounded-[2px] outline-none resize-none"
          style={{
            backgroundColor: c.inputBg,
            color: c.inputFg,
            border: `1px solid ${c.inputBorder}`,
          }}
        />
        <button
          type="button"
          disabled={!commitMsg.trim() || changes.length === 0}
          onClick={handleCommit}
          className="w-full h-[28px] rounded-[2px] text-[12px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-45 transition-colors"
          style={{
            backgroundColor: c.buttonBg,
            color: c.buttonFg,
          }}
        >
          <Check size={14} />
          <span>Commit</span>
        </button>
      </div>

      {/* Changes List */}
      <div className="flex-1 overflow-y-auto py-1">
        {changes.length === 0 ? (
          <div className="px-4 py-4 text-[12px] opacity-65">
            Working tree clean. Edit any file to track changes and open diffs.
          </div>
        ) : (
          <>
            {stagedChanges.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1 text-[11px] font-bold tracking-wide flex items-center justify-between opacity-80">
                  <span>STAGED CHANGES</span>
                  <span className="tabular-nums">{stagedChanges.length}</span>
                </div>
                {stagedChanges.map((ch) => renderChangeRow(ch, true))}
              </div>
            )}

            <div>
              <div className="px-3 py-1 text-[11px] font-bold tracking-wide flex items-center justify-between opacity-80">
                <span>CHANGES</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onStageAll}
                    className="hover:opacity-100 opacity-75"
                    title="Stage All Changes"
                  >
                    <Plus size={13} />
                  </button>
                  <span className="tabular-nums">{unstagedChanges.length}</span>
                </div>
              </div>
              {unstagedChanges.map((ch) => renderChangeRow(ch, false))}
            </div>
          </>
        )}

        {/* Commit Graph / History */}
        <div className="mt-3 pt-2 border-t" style={{ borderColor: c.sidebarBorder }}>
          <div className="px-3 py-1 text-[11px] font-bold tracking-wide opacity-80">
            COMMITS
          </div>
          {commits.map((commit) => (
            <div
              key={commit.id}
              className="px-3 py-1.5 text-[12px] flex items-start gap-2 hover:bg-white/5"
            >
              <GitCommitHorizontal size={14} className="mt-0.5 shrink-0" style={{ color: c.accent }} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{commit.message}</div>
                <div className="text-[11px] opacity-55 font-mono truncate">
                  {commit.hash} · {commit.author}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
