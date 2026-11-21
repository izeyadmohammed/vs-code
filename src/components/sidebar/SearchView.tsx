import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, ReplaceAll, CaseSensitive, Regex, WholeWord } from 'lucide-react';
import { FSNode, ThemeConfig } from '../../types/ide';
import { getNodePath } from '../../utils/fsHelpers';
import { FileIcon } from '../FileIcon';

interface SearchViewProps {
  theme: ThemeConfig;
  nodes: FSNode[];
  onSelectMatch: (fileId: string, line: number) => void;
  onReplaceAllInWorkspace: (query: string, replacement: string, matchCase: boolean) => number;
}

interface SearchMatch {
  line: number;
  text: string;
}

interface FileSearchResult {
  file: FSNode;
  path: string;
  matches: SearchMatch[];
}

export const SearchView: React.FC<SearchViewProps> = ({
  theme,
  nodes,
  onSelectMatch,
  onReplaceAllInWorkspace,
}) => {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [replaceStatus, setReplaceStatus] = useState<string | null>(null);

  const results = useMemo<FileSearchResult[]>(() => {
    if (!query) return [];
    const fileNodes = nodes.filter((n) => n.type === 'file');
    const out: FileSearchResult[] = [];

    let pattern: RegExp | null = null;
    try {
      const source = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wrapped = wholeWord ? `\\b${source}\\b` : source;
      pattern = new RegExp(wrapped, matchCase ? 'g' : 'gi');
    } catch {
      return [];
    }

    for (const file of fileNodes) {
      const lines = (file.content || '').split('\n');
      const matches: SearchMatch[] = [];
      lines.forEach((line, idx) => {
        pattern!.lastIndex = 0;
        if (pattern!.test(line)) {
          matches.push({ line: idx + 1, text: line.trim() });
        }
      });
      if (matches.length > 0) {
        out.push({
          file,
          path: getNodePath(nodes, file.id),
          matches,
        });
      }
    }
    return out;
  }, [nodes, query, matchCase, wholeWord, useRegex]);

  const totalMatches = results.reduce((acc, r) => acc + r.matches.length, 0);
  const c = theme.colors;

  const toggleCollapse = (fileId: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Search Inputs */}
      <div className="p-2.5 space-y-1.5 border-b" style={{ borderColor: c.sidebarBorder }}>
        <div className="flex items-start gap-1">
          <button
            type="button"
            onClick={() => setShowReplace((v) => !v)}
            className="mt-1 p-0.5 rounded hover:bg-white/10 shrink-0"
            title="Toggle Replace"
            aria-label="Toggle Replace"
          >
            {showReplace ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <div className="flex-1 space-y-1.5 min-w-0">
            <div
              className="flex items-center h-[26px] rounded-[2px] px-1.5"
              style={{
                backgroundColor: c.inputBg,
                border: `1px solid ${c.inputBorder}`,
              }}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setReplaceStatus(null);
                }}
                placeholder="Search across files..."
                className="flex-1 bg-transparent text-[12px] outline-none min-w-0"
                style={{ color: c.inputFg }}
              />
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMatchCase((v) => !v)}
                  title="Match Case"
                  className="p-0.5 rounded-[3px]"
                  style={{
                    backgroundColor: matchCase ? c.listActiveBg : 'transparent',
                    color: matchCase ? c.accent : c.sidebarFg,
                  }}
                >
                  <CaseSensitive size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setWholeWord((v) => !v)}
                  title="Match Whole Word"
                  className="p-0.5 rounded-[3px]"
                  style={{
                    backgroundColor: wholeWord ? c.listActiveBg : 'transparent',
                    color: wholeWord ? c.accent : c.sidebarFg,
                  }}
                >
                  <WholeWord size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setUseRegex((v) => !v)}
                  title="Use Regular Expression"
                  className="p-0.5 rounded-[3px]"
                  style={{
                    backgroundColor: useRegex ? c.listActiveBg : 'transparent',
                    color: useRegex ? c.accent : c.sidebarFg,
                  }}
                >
                  <Regex size={13} />
                </button>
              </div>
            </div>

            {showReplace && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replace..."
                  className="flex-1 h-[26px] px-2 rounded-[2px] text-[12px] outline-none min-w-0"
                  style={{
                    backgroundColor: c.inputBg,
                    color: c.inputFg,
                    border: `1px solid ${c.inputBorder}`,
                  }}
                />
                <button
                  type="button"
                  disabled={!query || totalMatches === 0}
                  onClick={() => {
                    const count = onReplaceAllInWorkspace(query, replaceText, matchCase);
                    setReplaceStatus(`Replaced ${count} occurrence(s)`);
                  }}
                  title="Replace All"
                  className="h-[26px] px-2 rounded-[2px] flex items-center justify-center disabled:opacity-40 hover:bg-white/10"
                  style={{ border: `1px solid ${c.inputBorder}` }}
                >
                  <ReplaceAll size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {query && (
          <div className="text-[11px] opacity-70 pl-5 tabular-nums">
            {totalMatches} result{totalMatches === 1 ? '' : 's'} in {results.length} file
            {results.length === 1 ? '' : 's'}
            {replaceStatus ? ` · ${replaceStatus}` : ''}
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto py-1">
        {!query ? (
          <div className="px-4 py-4 text-[12px] opacity-65">
            Type to search across all workspace files. Click any match to jump directly to that line.
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-4 text-[12px] opacity-65">
            No results found for &ldquo;{query}&rdquo;.
          </div>
        ) : (
          results.map((res) => {
            const isCollapsed = collapsedFiles.has(res.file.id);
            return (
              <div key={res.file.id}>
                <button
                  type="button"
                  onClick={() => toggleCollapse(res.file.id)}
                  className="w-full h-[22px] px-2 flex items-center justify-between text-[12px] hover:bg-white/5"
                >
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <FileIcon name={res.file.name} language={res.file.language} size={13} />
                    <span className="truncate font-medium">{res.file.name}</span>
                  </span>
                  <span className="text-[11px] opacity-60 tabular-nums shrink-0 pl-2">
                    {res.matches.length}
                  </span>
                </button>
                {!isCollapsed &&
                  res.matches.map((m, idx) => (
                    <button
                      key={`${res.file.id}-${m.line}-${idx}`}
                      type="button"
                      onClick={() => onSelectMatch(res.file.id, m.line)}
                      className="w-full h-[22px] pl-7 pr-2 flex items-center gap-2 text-left text-[12px] font-mono hover:bg-white/10 truncate"
                    >
                      <span className="opacity-50 tabular-nums shrink-0">{m.line}:</span>
                      <span className="truncate opacity-85">{m.text}</span>
                    </button>
                  ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
