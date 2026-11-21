import { FSNode } from '../types/ide';

export function getNodePath(nodes: FSNode[], nodeId: string): string {
  const parts: string[] = [];
  let current = nodes.find((n) => n.id === nodeId);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? nodes.find((n) => n.id === current!.parentId) : undefined;
  }
  return parts.join('/');
}

export function getNodeBreadcrumbParts(nodes: FSNode[], nodeId: string): Array<{ id: string; name: string; type: 'file' | 'folder' }> {
  const parts: Array<{ id: string; name: string; type: 'file' | 'folder' }> = [];
  let current = nodes.find((n) => n.id === nodeId);
  while (current) {
    parts.unshift({ id: current.id, name: current.name, type: current.type });
    current = current.parentId ? nodes.find((n) => n.id === current!.parentId) : undefined;
  }
  return parts;
}

export function findNodeByPath(nodes: FSNode[], rawPath: string, cwd = '/'): FSNode | undefined {
  const normalized = normalizePath(rawPath, cwd);
  const clean = normalized.replace(/^\/+/, '');
  if (!clean) return undefined;
  return nodes.find((n) => getNodePath(nodes, n.id) === clean);
}

export function normalizePath(target: string, cwd = '/'): string {
  const isAbs = target.startsWith('/');
  const baseParts = isAbs ? [] : cwd.split('/').filter(Boolean);
  const targetParts = target.split('/').filter(Boolean);
  const stack = [...baseParts];

  for (const part of targetParts) {
    if (part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return '/' + stack.join('/');
}

export function getDescendantIds(nodes: FSNode[], folderId: string): string[] {
  const ids: string[] = [];
  const children = nodes.filter((n) => n.parentId === folderId);
  for (const child of children) {
    ids.push(child.id);
    if (child.type === 'folder') {
      ids.push(...getDescendantIds(nodes, child.id));
    }
  }
  return ids;
}

export interface OutlineSymbol {
  name: string;
  kind: 'function' | 'interface' | 'const' | 'class' | 'heading' | 'selector';
  line: number;
}

export function extractOutlineSymbols(content: string, language?: string): OutlineSymbol[] {
  const lines = content.split('\n');
  const symbols: OutlineSymbol[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (language === 'markdown') {
      const m = trimmed.match(/^(#{1,4})\s+(.+)/);
      if (m) {
        symbols.push({ name: m[2], kind: 'heading', line: idx + 1 });
      }
      return;
    }
    if (language === 'css') {
      const m = trimmed.match(/^([.#a-zA-Z:][^{]+)\s*\{/);
      if (m) {
        symbols.push({ name: m[1].trim(), kind: 'selector', line: idx + 1 });
      }
      return;
    }
    const fnMatch = trimmed.match(/^(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|def)\s+([a-zA-Z_$][\w$]*)/);
    if (fnMatch) {
      symbols.push({ name: fnMatch[1], kind: 'function', line: idx + 1 });
      return;
    }
    const ifaceMatch = trimmed.match(/^(?:export\s+)?(?:interface|type)\s+([a-zA-Z_$][\w$]*)/);
    if (ifaceMatch) {
      symbols.push({ name: ifaceMatch[1], kind: 'interface', line: idx + 1 });
      return;
    }
    const classMatch = trimmed.match(/^(?:export\s+)?class\s+([a-zA-Z_$][\w$]*)/);
    if (classMatch) {
      symbols.push({ name: classMatch[1], kind: 'class', line: idx + 1 });
      return;
    }
    const constFnMatch = trimmed.match(/^(?:export\s+)?const\s+([a-zA-Z_$][\w$]*)\s*=/);
    if (constFnMatch) {
      symbols.push({ name: constFnMatch[1], kind: 'const', line: idx + 1 });
    }
  });

  return symbols;
}
