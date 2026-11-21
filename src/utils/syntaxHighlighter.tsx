import React from 'react';
import { FileLanguage, ThemeTokens } from '../types/ide';

interface TokenSegment {
  text: string;
  color?: string;
  italic?: boolean;
  bold?: boolean;
}

const JS_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'class', 'extends', 'implements',
  'interface', 'type', 'enum', 'async', 'await', 'new', 'this', 'super',
  'true', 'false', 'null', 'undefined', 'void', 'typeof', 'instanceof',
  'in', 'of', 'private', 'public', 'protected', 'readonly', 'static', 'declare',
]);

const JS_CONTROL = new Set([
  'import', 'from', 'export', 'default', 'return', 'if', 'else', 'for',
  'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch',
  'finally', 'throw', 'as',
]);

const PY_KEYWORDS = new Set([
  'def', 'class', 'True', 'False', 'None', 'and', 'or', 'not', 'is', 'in',
  'lambda', 'global', 'nonlocal', 'pass', 'self',
]);

const PY_CONTROL = new Set([
  'import', 'from', 'as', 'return', 'if', 'elif', 'else', 'for', 'while',
  'break', 'continue', 'try', 'except', 'finally', 'raise', 'with', 'yield',
]);

export function tokenizeLine(
  line: string,
  language: FileLanguage,
  tokens: ThemeTokens
): TokenSegment[] {
  if (!line) return [{ text: '' }];

  if (language === 'plaintext') {
    return [{ text: line }];
  }

  if (language === 'markdown') {
    if (/^#{1,6}\s/.test(line)) {
      return [{ text: line, color: tokens.keyword, bold: true }];
    }
    if (/^```/.test(line.trim())) {
      return [{ text: line, color: tokens.comment }];
    }
    if (/^\s*[-*+]\s/.test(line)) {
      const m = line.match(/^(\s*[-*+]\s)(.*)$/);
      if (m) {
        return [
          { text: m[1], color: tokens.control },
          ...tokenizeInlineMarkdown(m[2], tokens),
        ];
      }
    }
    return tokenizeInlineMarkdown(line, tokens);
  }

  if (language === 'json') {
    return tokenizeJsonLine(line, tokens);
  }

  if (language === 'css') {
    return tokenizeCssLine(line, tokens);
  }

  if (language === 'html') {
    return tokenizeHtmlLine(line, tokens);
  }

  return tokenizeCodeLine(line, language === 'python' ? 'python' : 'js', tokens);
}

function tokenizeInlineMarkdown(line: string, tokens: ThemeTokens): TokenSegment[] {
  const segments: TokenSegment[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('`')) {
      segments.push({ text: token, color: tokens.string });
    } else {
      segments.push({ text: token, color: tokens.function, bold: true });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex) });
  }
  return segments;
}

function tokenizeJsonLine(line: string, tokens: ThemeTokens): TokenSegment[] {
  const segments: TokenSegment[] = [];
  const regex = /("(?:\\.|[^"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), color: tokens.punctuation });
    }
    if (match[1]) {
      if (match[2]) {
        segments.push({ text: match[1], color: tokens.property });
        segments.push({ text: match[2], color: tokens.punctuation });
      } else {
        segments.push({ text: match[1], color: tokens.string });
      }
    } else if (match[3]) {
      segments.push({ text: match[3], color: tokens.keyword });
    } else {
      segments.push({ text: match[0], color: tokens.number });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), color: tokens.punctuation });
  }
  return segments;
}

function tokenizeCssLine(line: string, tokens: ThemeTokens): TokenSegment[] {
  const trimmed = line.trim();
  if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) {
    return [{ text: line, color: tokens.comment, italic: true }];
  }
  const segments: TokenSegment[] = [];
  const regex = /(\/\*.*?\*\/|@[a-z-]+|--[\w-]+|#[0-9a-fA-F]{3,8}\b|'[^']*'|"[^"]*"|\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms)?\b|[a-z-]+(?=\s*:)|[.#][\w-]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index) });
    }
    const tok = match[0];
    if (tok.startsWith('/*')) {
      segments.push({ text: tok, color: tokens.comment, italic: true });
    } else if (tok.startsWith('@')) {
      segments.push({ text: tok, color: tokens.control });
    } else if (tok.startsWith('--')) {
      segments.push({ text: tok, color: tokens.variable });
    } else if (tok.startsWith('#') && /^#[0-9a-fA-F]{3,8}$/.test(tok)) {
      segments.push({ text: tok, color: tokens.string });
    } else if (tok.startsWith("'") || tok.startsWith('"')) {
      segments.push({ text: tok, color: tokens.string });
    } else if (/^\d/.test(tok)) {
      segments.push({ text: tok, color: tokens.number });
    } else if (tok.startsWith('.') || tok.startsWith('#')) {
      segments.push({ text: tok, color: tokens.function });
    } else {
      segments.push({ text: tok, color: tokens.property });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex) });
  }
  return segments;
}

function tokenizeHtmlLine(line: string, tokens: ThemeTokens): TokenSegment[] {
  const segments: TokenSegment[] = [];
  const regex = /(<!--[\s\S]*?-->|<\/?[a-zA-Z0-9-]+|\s+[a-zA-Z-:]+(?==)|"[^"]*"|'[^']*'|\/?>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index) });
    }
    const tok = match[0];
    if (tok.startsWith('<!--')) {
      segments.push({ text: tok, color: tokens.comment, italic: true });
    } else if (tok.startsWith('<') || tok === '>' || tok === '/>') {
      segments.push({ text: tok, color: tokens.tag });
    } else if (tok.startsWith('"') || tok.startsWith("'")) {
      segments.push({ text: tok, color: tokens.string });
    } else {
      segments.push({ text: tok, color: tokens.attribute });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex) });
  }
  return segments;
}

function tokenizeCodeLine(
  line: string,
  lang: 'js' | 'python',
  tokens: ThemeTokens
): TokenSegment[] {
  const segments: TokenSegment[] = [];
  const kwSet = lang === 'python' ? PY_KEYWORDS : JS_KEYWORDS;
  const ctrlSet = lang === 'python' ? PY_CONTROL : JS_CONTROL;

  const trimmed = line.trim();
  if (
    (lang === 'js' && (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*'))) ||
    (lang === 'python' && trimmed.startsWith('#'))
  ) {
    return [{ text: line, color: tokens.comment, italic: true }];
  }

  const regex =
    lang === 'python'
      ? /(#.*$|f?"(?:\\.|[^"])*"|f?'(?:\\.|[^'])*'|\b\d+(?:\.\d+)?\b|@[a-zA-Z_]\w*|\b[A-Za-z_]\w*(?=\s*\()|\b[A-Z][A-Za-z0-9_]*\b|\b[a-zA-Z_]\w*\b)/g
      : /(\/\/.*$|\/\*.*?\*\/|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`|\b\d+(?:\.\d+)?\b|<\/?[A-Za-z][A-Za-z0-9.]*|\b[A-Za-z_$][\w$]*(?=\s*\()|\b[A-Z][A-Za-z0-9_$]*\b|\b[a-zA-Z_$][\w$]*\b)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index) });
    }
    const tok = match[0];

    if (tok.startsWith('//') || tok.startsWith('/*') || (lang === 'python' && tok.startsWith('#'))) {
      segments.push({ text: tok, color: tokens.comment, italic: true });
    } else if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith('`') || tok.startsWith('f"') || tok.startsWith("f'")) {
      segments.push({ text: tok, color: tokens.string });
    } else if (/^\d/.test(tok)) {
      segments.push({ text: tok, color: tokens.number });
    } else if (tok.startsWith('<')) {
      segments.push({ text: tok, color: tokens.type });
    } else if (tok.startsWith('@')) {
      segments.push({ text: tok, color: tokens.control });
    } else if (ctrlSet.has(tok)) {
      segments.push({ text: tok, color: tokens.control });
    } else if (kwSet.has(tok)) {
      segments.push({ text: tok, color: tokens.keyword });
    } else if (/^[A-Z]/.test(tok)) {
      segments.push({ text: tok, color: tokens.type });
    } else {
      // Check if followed by '(' in original line
      const nextChar = line[regex.lastIndex];
      if (nextChar === '(') {
        segments.push({ text: tok, color: tokens.function });
      } else {
        segments.push({ text: tok, color: tokens.variable });
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex) });
  }

  return segments;
}

export function renderHighlightedLine(
  line: string,
  language: FileLanguage,
  tokens: ThemeTokens,
  searchQuery?: string
): React.ReactNode {
  const segments = tokenizeLine(line, language, tokens);
  if (!searchQuery) {
    return segments.map((seg, i) => (
      <span
        key={i}
        style={{
          color: seg.color,
          fontStyle: seg.italic ? 'italic' : undefined,
          fontWeight: seg.bold ? 600 : undefined,
        }}
      >
        {seg.text}
      </span>
    ));
  }

  const lowerQ = searchQuery.toLowerCase();
  return segments.map((seg, i) => {
    const lowerText = seg.text.toLowerCase();
    if (!lowerQ || !lowerText.includes(lowerQ)) {
      return (
        <span
          key={i}
          style={{
            color: seg.color,
            fontStyle: seg.italic ? 'italic' : undefined,
            fontWeight: seg.bold ? 600 : undefined,
          }}
        >
          {seg.text}
        </span>
      );
    }

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    let idx = lowerText.indexOf(lowerQ, cursor);
    let keyPart = 0;
    while (idx !== -1) {
      if (idx > cursor) {
        parts.push(seg.text.slice(cursor, idx));
      }
      parts.push(
        <mark
          key={keyPart++}
          style={{
            backgroundColor: 'rgba(234, 179, 8, 0.35)',
            color: 'inherit',
            borderRadius: '2px',
          }}
        >
          {seg.text.slice(idx, idx + searchQuery.length)}
        </mark>
      );
      cursor = idx + searchQuery.length;
      idx = lowerText.indexOf(lowerQ, cursor);
    }
    if (cursor < seg.text.length) {
      parts.push(seg.text.slice(cursor));
    }

    return (
      <span
        key={i}
        style={{
          color: seg.color,
          fontStyle: seg.italic ? 'italic' : undefined,
          fontWeight: seg.bold ? 600 : undefined,
        }}
      >
        {parts}
      </span>
    );
  });
}
