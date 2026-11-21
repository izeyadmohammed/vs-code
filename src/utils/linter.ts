import { DiagnosticItem, FileLanguage, FSNode } from '../types/ide';
import { getNodePath } from './fsHelpers';

export function runWorkspaceDiagnostics(
  nodes: FSNode[],
  eslintEnabled: boolean
): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];

  for (const node of nodes) {
    if (node.type !== 'file') continue;
    const content = node.content ?? '';
    const filePath = getNodePath(nodes, node.id);

    if (node.language === 'json') {
      try {
        JSON.parse(content);
      } catch (err) {
        diagnostics.push({
          id: `${node.id}-json-err`,
          fileId: node.id,
          filePath,
          line: 1,
          col: 1,
          severity: 'error',
          message: err instanceof Error ? err.message : 'Invalid JSON syntax',
          source: 'json',
        });
      }
    }

    if (
      node.language === 'typescript' ||
      node.language === 'tsx' ||
      node.language === 'javascript' ||
      node.language === 'jsx'
    ) {
      // Check balanced braces/parens
      let braceBalance = 0;
      let parenBalance = 0;
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const ch of line) {
          if (ch === '{') braceBalance++;
          else if (ch === '}') braceBalance--;
          else if (ch === '(') parenBalance++;
          else if (ch === ')') parenBalance--;
        }

        if (eslintEnabled) {
          if (/\bvar\s+/.test(line) && !line.trim().startsWith('//')) {
            diagnostics.push({
              id: `${node.id}-var-${idx}`,
              fileId: node.id,
              filePath,
              line: idx + 1,
              col: line.indexOf('var') + 1,
              severity: 'warning',
              message: "Unexpected 'var', use 'let' or 'const' instead. (no-var)",
              source: 'eslint',
            });
          }
          if (/TODO|FIXME/.test(line)) {
            diagnostics.push({
              id: `${node.id}-todo-${idx}`,
              fileId: node.id,
              filePath,
              line: idx + 1,
              col: 1,
              severity: 'info',
              message: 'Task marker detected in comment.',
              source: 'workspace',
            });
          }
        }
      });

      if (braceBalance !== 0) {
        diagnostics.push({
          id: `${node.id}-brace`,
          fileId: node.id,
          filePath,
          line: lines.length,
          col: 1,
          severity: 'error',
          message:
            braceBalance > 0
              ? "'}' expected: unclosed block brace."
              : "Unexpected '}': extra closing brace.",
          source: 'ts',
        });
      }
      if (parenBalance !== 0) {
        diagnostics.push({
          id: `${node.id}-paren`,
          fileId: node.id,
          filePath,
          line: lines.length,
          col: 1,
          severity: 'error',
          message:
            parenBalance > 0
              ? "')' expected: unclosed parenthesis."
              : "Unexpected ')': extra closing parenthesis.",
          source: 'ts',
        });
      }
    }
  }

  return diagnostics;
}

export function formatCode(content: string, language?: FileLanguage, tabSize = 2): string {
  if (language === 'json') {
    try {
      return JSON.stringify(JSON.parse(content), null, tabSize) + '\n';
    } catch {
      return content;
    }
  }

  const indentUnit = ' '.repeat(tabSize);
  const lines = content.split('\n');
  let level = 0;
  const formatted: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      formatted.push('');
      continue;
    }

    if (/^[}\])]/.test(trimmed)) {
      level = Math.max(0, level - 1);
    }

    formatted.push(indentUnit.repeat(level) + trimmed);

    const opens = (trimmed.match(/[{(\[]/g) || []).length;
    const closes = (trimmed.match(/[})\]]/g) || []).length;
    const net = opens - closes;
    if (/^[}\])]/.test(trimmed)) {
      level = Math.max(0, level + net + 1);
    } else {
      level = Math.max(0, level + net);
    }
  }

  return formatted.join('\n').replace(/\n+$/, '\n');
}
