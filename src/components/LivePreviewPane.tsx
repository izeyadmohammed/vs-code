import React from 'react';
import { FSNode, ThemeConfig } from '../types/ide';

interface LivePreviewPaneProps {
  theme: ThemeConfig;
  file: FSNode;
}

export const LivePreviewPane: React.FC<LivePreviewPaneProps> = ({ theme, file }) => {
  const c = theme.colors;
  const content = file.content || '';

  if (file.language === 'markdown') {
    const renderedHtml = markdownToHtml(content);
    return (
      <div
        className="flex-1 h-full overflow-y-auto p-6"
        style={{ backgroundColor: c.editorBg, color: c.editorFg }}
      >
        <div
          className="max-w-2xl mx-auto space-y-3 text-[14px] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden">
      <div
        className="h-[28px] px-3 flex items-center justify-between text-[11px] border-b shrink-0"
        style={{
          backgroundColor: c.tabBarBg,
          color: c.tabActiveFg,
          borderColor: c.tabBorder,
        }}
      >
        <span>Live Preview — {file.name}</span>
        <span className="opacity-60 font-mono">localhost:3000/{file.name}</span>
      </div>
      <iframe
        title={`Preview ${file.name}`}
        srcDoc={content}
        sandbox="allow-scripts"
        className="w-full flex-1 border-0 bg-white"
      />
    </div>
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function markdownToHtml(md: string): string {
  const escaped = escapeHtml(md);
  const blocks = escaped.split(/```[\w]*\n([\s\S]*?)```/g);
  return blocks
    .map((part, idx) => {
      if (idx % 2 === 1) {
        return `<pre style="background:rgba(128,128,128,0.14);padding:12px;border-radius:6px;overflow:auto;font-family:'JetBrains Mono',monospace;font-size:12px;"><code>${part}</code></pre>`;
      }
      return part
        .split('\n')
        .map((line) => {
          if (line.startsWith('### ')) {
            return `<h3 style="font-size:16px;font-weight:700;margin-top:16px;">${line.slice(4)}</h3>`;
          }
          if (line.startsWith('## ')) {
            return `<h2 style="font-size:19px;font-weight:700;margin-top:20px;border-bottom:1px solid rgba(128,128,128,0.2);padding-bottom:4px;">${line.slice(3)}</h2>`;
          }
          if (line.startsWith('# ')) {
            return `<h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">${line.slice(2)}</h1>`;
          }
          if (line.startsWith('- ')) {
            return `<div style="padding-left:14px;">• ${inlineFormat(line.slice(2))}</div>`;
          }
          if (!line.trim()) return '<div style="height:8px;"></div>';
          return `<p>${inlineFormat(line)}</p>`;
        })
        .join('');
    })
    .join('');
}

function inlineFormat(line: string): string {
  return line
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(128,128,128,0.2);padding:1px 5px;border-radius:3px;font-family:\'JetBrains Mono\',monospace;font-size:12px;">$1</code>');
}
