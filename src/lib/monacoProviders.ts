import * as monaco from 'monaco-editor';
import { FSNode } from '../types/ide';
import { getNodePath } from '../utils/fsHelpers';
import { formatCode } from '../utils/linter';

let providersRegistered = false;
let workspaceNodesRef: FSNode[] = [];

export function updateProviderWorkspaceNodes(nodes: FSNode[]) {
  workspaceNodesRef = nodes;
}

const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

export function isVoidHtmlTag(tag: string): boolean {
  return VOID_HTML_TAGS.has(tag.toLowerCase());
}

const HTML5_BOILERPLATE = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '\t<meta charset="UTF-8" />',
  '\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '\t<title>${1:Document}</title>',
  '</head>',
  '<body>',
  '\t$0',
  '</body>',
  '</html>',
].join('\n');

interface TagDef {
  tag: string;
  snippetHtml: string;
  snippetJsx?: string;
  desc: string;
}

const ALL_HTML_TAGS: TagDef[] = [
  { tag: 'h1', snippetHtml: '<h1>$0</h1>', desc: 'Heading 1' },
  { tag: 'h2', snippetHtml: '<h2>$0</h2>', desc: 'Heading 2' },
  { tag: 'h3', snippetHtml: '<h3>$0</h3>', desc: 'Heading 3' },
  { tag: 'h4', snippetHtml: '<h4>$0</h4>', desc: 'Heading 4' },
  { tag: 'h5', snippetHtml: '<h5>$0</h5>', desc: 'Heading 5' },
  { tag: 'h6', snippetHtml: '<h6>$0</h6>', desc: 'Heading 6' },
  { tag: 'p', snippetHtml: '<p>$0</p>', desc: 'Paragraph' },
  { tag: 'div', snippetHtml: '<div>$0</div>', desc: 'Division container' },
  { tag: 'span', snippetHtml: '<span>$0</span>', desc: 'Inline span' },
  { tag: 'a', snippetHtml: '<a href="${1:#}">$0</a>', desc: 'Anchor link' },
  { tag: 'button', snippetHtml: '<button type="${1:button}">$0</button>', desc: 'Button element' },
  { tag: 'img', snippetHtml: '<img src="${1:}" alt="${2:}" />$0', desc: 'Image (self-closing)' },
  { tag: 'input', snippetHtml: '<input type="${1:text}" placeholder="${2:}" />$0', desc: 'Input field' },
  { tag: 'textarea', snippetHtml: '<textarea name="${1:}" rows="${2:4}">$0</textarea>', desc: 'Text area' },
  { tag: 'label', snippetHtml: '<label for="${1:}">${2:Label}</label>$0', snippetJsx: '<label htmlFor="${1:}">${2:Label}</label>$0', desc: 'Form label' },
  { tag: 'form', snippetHtml: '<form action="${1:#}" method="${2:post}">\n\t$0\n</form>', snippetJsx: '<form onSubmit={${1:handleSubmit}}>\n\t$0\n</form>', desc: 'Form container' },
  { tag: 'select', snippetHtml: '<select name="${1:}">\n\t<option value="${2:}">${3:Option}</option>\n</select>$0', desc: 'Select dropdown' },
  { tag: 'option', snippetHtml: '<option value="${1:}">${2:Option}</option>$0', desc: 'Select option' },
  { tag: 'ul', snippetHtml: '<ul>\n\t<li>$0</li>\n</ul>', desc: 'Unordered list' },
  { tag: 'ol', snippetHtml: '<ol>\n\t<li>$0</li>\n</ol>', desc: 'Ordered list' },
  { tag: 'li', snippetHtml: '<li>$0</li>', desc: 'List item' },
  { tag: 'nav', snippetHtml: '<nav>\n\t$0\n</nav>', desc: 'Navigation section' },
  { tag: 'header', snippetHtml: '<header>\n\t$0\n</header>', desc: 'Header section' },
  { tag: 'main', snippetHtml: '<main>\n\t$0\n</main>', desc: 'Main content' },
  { tag: 'section', snippetHtml: '<section>\n\t$0\n</section>', desc: 'Document section' },
  { tag: 'article', snippetHtml: '<article>\n\t$0\n</article>', desc: 'Article element' },
  { tag: 'aside', snippetHtml: '<aside>\n\t$0\n</aside>', desc: 'Aside sidebar' },
  { tag: 'footer', snippetHtml: '<footer>\n\t$0\n</footer>', desc: 'Footer section' },
  { tag: 'head', snippetHtml: '<head>\n\t$0\n</head>', desc: 'Document head' },
  { tag: 'body', snippetHtml: '<body>\n\t$0\n</body>', desc: 'Document body' },
  { tag: 'html', snippetHtml: '<html lang="${1:en}">\n\t$0\n</html>', desc: 'HTML root element' },
  { tag: 'title', snippetHtml: '<title>$0</title>', desc: 'Document title' },
  { tag: 'meta', snippetHtml: '<meta name="${1:}" content="${2:}" />$0', desc: 'Metadata tag' },
  { tag: 'link', snippetHtml: '<link rel="${1:stylesheet}" href="${2:style.css}" />$0', desc: 'External resource link' },
  { tag: 'script', snippetHtml: '<script>\n\t$0\n</script>', desc: 'Script block' },
  { tag: 'style', snippetHtml: '<style>\n\t$0\n</style>', desc: 'Style block' },
  { tag: 'table', snippetHtml: '<table>\n\t<thead>\n\t\t<tr>\n\t\t\t<th>${1:Header}</th>\n\t\t</tr>\n\t</thead>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td>$0</td>\n\t\t</tr>\n\t</tbody>\n</table>', desc: 'HTML Table' },
  { tag: 'thead', snippetHtml: '<thead>\n\t$0\n</thead>', desc: 'Table head' },
  { tag: 'tbody', snippetHtml: '<tbody>\n\t$0\n</tbody>', desc: 'Table body' },
  { tag: 'tr', snippetHtml: '<tr>\n\t$0\n</tr>', desc: 'Table row' },
  { tag: 'th', snippetHtml: '<th>$0</th>', desc: 'Table header cell' },
  { tag: 'td', snippetHtml: '<td>$0</td>', desc: 'Table data cell' },
  { tag: 'strong', snippetHtml: '<strong>$0</strong>', desc: 'Strong emphasis' },
  { tag: 'em', snippetHtml: '<em>$0</em>', desc: 'Italic emphasis' },
  { tag: 'small', snippetHtml: '<small>$0</small>', desc: 'Small text' },
  { tag: 'code', snippetHtml: '<code>$0</code>', desc: 'Inline code' },
  { tag: 'pre', snippetHtml: '<pre>$0</pre>', desc: 'Preformatted block' },
  { tag: 'blockquote', snippetHtml: '<blockquote>$0</blockquote>', desc: 'Block quotation' },
  { tag: 'br', snippetHtml: '<br />$0', desc: 'Line break' },
  { tag: 'hr', snippetHtml: '<hr />$0', desc: 'Horizontal rule' },
  { tag: 'svg', snippetHtml: '<svg width="${1:24}" height="${2:24}" viewBox="0 0 ${1:24} ${2:24}" fill="none">\n\t$0\n</svg>', desc: 'SVG vector graphic' },
  { tag: 'canvas', snippetHtml: '<canvas id="${1:canvas}" width="${2:400}" height="${3:300}"></canvas>$0', desc: 'HTML5 Canvas' },
  { tag: 'video', snippetHtml: '<video src="${1:}" controls>\n\t$0\n</video>', desc: 'Video player' },
  { tag: 'audio', snippetHtml: '<audio src="${1:}" controls></audio>$0', desc: 'Audio player' },
  { tag: 'iframe', snippetHtml: '<iframe src="${1:}" title="${2:}" width="${3:600}" height="${4:400}"></iframe>$0', desc: 'Inline frame' },
];

const ALL_HTML_TAG_NAMES = new Set(ALL_HTML_TAGS.map((t) => t.tag));

/**
 * Parses Emmet-like abbreviations such as:
 * - div.card -> <div class="card">$0</div> (or className in JSX)
 * - button#submit.btn.primary -> <button id="submit" class="btn primary">$0</button>
 * - ul>li*3 -> <ul>\n\t<li>$1</li>...</ul>
 * - h1 -> <h1>$0</h1>
 */
function expandEmmetAbbreviation(
  abbr: string,
  isJsx: boolean
): { insertText: string; label: string; detail: string } | null {
  const trimmed = abbr.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  if (!/^[a-zA-Z.#][a-zA-Z0-9.#\-_*>:]*$/.test(trimmed)) return null;

  const classAttr = isJsx ? 'className' : 'class';

  // Handle input:type shorthand (e.g. input:email, input:password, input:checkbox)
  const inputTypeMatch = trimmed.match(/^input:([a-zA-Z]+)$/);
  if (inputTypeMatch) {
    return {
      insertText: `<input type="${inputTypeMatch[1]}" placeholder="\${1:}" />$0`,
      label: trimmed,
      detail: `Emmet: <input type="${inputTypeMatch[1]}" />`,
    };
  }

  const parseSingle = (part: string, tabIdx: number): string | null => {
    let working = part;
    let count = 1;
    const mulMatch = working.match(/\*([1-9]\d?)$/);
    if (mulMatch) {
      count = Math.min(10, parseInt(mulMatch[1], 10));
      working = working.slice(0, -mulMatch[0].length);
    }

    const tokens = working.match(/([.#]?[a-zA-Z0-9\-_]+)/g);
    if (!tokens || tokens.join('') !== working) return null;

    let tag = 'div';
    let id = '';
    const classes: string[] = [];

    for (const tok of tokens) {
      if (tok.startsWith('#')) {
        id = tok.slice(1);
      } else if (tok.startsWith('.')) {
        classes.push(tok.slice(1));
      } else {
        tag = tok;
      }
    }

    const isKnownTag = ALL_HTML_TAG_NAMES.has(tag.toLowerCase());
    if (!isKnownTag && !id && classes.length === 0 && !mulMatch) {
      return null;
    }

    const attrs: string[] = [];
    if (id) attrs.push(`id="${id}"`);
    if (classes.length > 0) attrs.push(`${classAttr}="${classes.join(' ')}"`);

    if (tag === 'a' && !attrs.some((a) => a.startsWith('href'))) {
      attrs.push(`href="\${${tabIdx}:#}"`);
      tabIdx++;
    } else if (tag === 'img') {
      attrs.push(`src="\${${tabIdx}:}"`, `alt="\${${tabIdx + 1}:}"`);
      tabIdx += 2;
    } else if (tag === 'input') {
      attrs.push(`type="\${${tabIdx}:text}"`);
      tabIdx++;
    }

    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

    const lines: string[] = [];
    for (let i = 0; i < count; i++) {
      const placeholder = count === 1 ? `$0` : `\${${i + 1}:item ${i + 1}}`;
      if (isVoidHtmlTag(tag)) {
        lines.push(`<${tag}${attrStr} />${count === 1 ? '$0' : ''}`);
      } else {
        lines.push(`<${tag}${attrStr}>${placeholder}</${tag}>`);
      }
    }
    return lines.join('\n');
  };

  if (trimmed.includes('>')) {
    const segments = trimmed.split('>').filter(Boolean);
    if (segments.length === 2) {
      const outer = parseSingle(segments[0], 1);
      const inner = parseSingle(segments[1], 2);
      if (outer && inner && outer.includes('$0')) {
        const indentedInner = inner
          .split('\n')
          .map((l) => `\t${l}`)
          .join('\n');
        const combined = outer.replace('$0', `\n${indentedInner}\n`);
        return {
          insertText: combined,
          label: trimmed,
          detail: 'Emmet Abbreviation',
        };
      }
    }
    return null;
  }

  if (
    !trimmed.includes('.') &&
    !trimmed.includes('#') &&
    !trimmed.includes('*') &&
    !ALL_HTML_TAG_NAMES.has(trimmed.toLowerCase())
  ) {
    return null;
  }

  const expanded = parseSingle(trimmed, 1);
  if (!expanded) return null;

  return {
    insertText: expanded,
    label: trimmed,
    detail: `Emmet: ${expanded.replace(/\$\{\d+:([^}]*)\}/g, '$1').replace(/\$0/g, '')}`,
  };
}

const PYTHON_BUILTINS: Array<{
  name: string;
  insertText: string;
  detail: string;
  doc: string;
}> = [
  {
    name: 'print',
    insertText: 'print(${1:value})',
    detail: 'print(*values, sep=" ", end="\\n")',
    doc: 'Prints the values to standard output.',
  },
  {
    name: 'len',
    insertText: 'len(${1:obj})',
    detail: 'len(obj) -> int',
    doc: 'Return the number of items in a container.',
  },
  {
    name: 'range',
    insertText: 'range(${1:stop})',
    detail: 'range(start, stop[, step])',
    doc: 'Return an object that produces a sequence of integers.',
  },
  {
    name: 'enumerate',
    insertText: 'enumerate(${1:iterable})',
    detail: 'enumerate(iterable, start=0)',
    doc: 'Return an enumerate object yielding pairs of (index, item).',
  },
  {
    name: 'zip',
    insertText: 'zip(${1:iter1}, ${2:iter2})',
    detail: 'zip(*iterables)',
    doc: 'Iterate over several iterables in parallel.',
  },
  {
    name: 'isinstance',
    insertText: 'isinstance(${1:obj}, ${2:type})',
    detail: 'isinstance(obj, class_or_tuple) -> bool',
    doc: 'Return whether an object is an instance of a class or subclass.',
  },
  {
    name: 'sorted',
    insertText: 'sorted(${1:iterable})',
    detail: 'sorted(iterable, key=None, reverse=False) -> list',
    doc: 'Return a new sorted list from the items in iterable.',
  },
  {
    name: 'open',
    insertText: 'open(${1:"file.txt"}, ${2:"r"}, encoding="utf-8")',
    detail: 'open(file, mode="r", encoding=None)',
    doc: 'Open file and return a corresponding file object.',
  },
  {
    name: 'input',
    insertText: 'input(${1:prompt})',
    detail: 'input(prompt="") -> str',
    doc: 'Read a string from standard input.',
  },
  { name: 'sum', insertText: 'sum(${1:iterable})', detail: 'sum(iterable) -> number', doc: 'Sum items of an iterable.' },
  { name: 'min', insertText: 'min(${1:iterable})', detail: 'min(iterable)', doc: 'Return the smallest item.' },
  { name: 'max', insertText: 'max(${1:iterable})', detail: 'max(iterable)', doc: 'Return the largest item.' },
  { name: 'map', insertText: 'map(${1:func}, ${2:iterable})', detail: 'map(func, *iterables)', doc: 'Apply function to every item of iterable.' },
  { name: 'filter', insertText: 'filter(${1:func}, ${2:iterable})', detail: 'filter(func, iterable)', doc: 'Filter elements for which function returns true.' },
  { name: 'dict', insertText: 'dict(${1})', detail: 'dict(**kwargs)', doc: 'Create a new dictionary.' },
  { name: 'list', insertText: 'list(${1})', detail: 'list(iterable)', doc: 'Create a new list.' },
  { name: 'set', insertText: 'set(${1})', detail: 'set(iterable)', doc: 'Create a new set.' },
  { name: 'str', insertText: 'str(${1})', detail: 'str(object="") -> str', doc: 'Convert object to string.' },
  { name: 'int', insertText: 'int(${1})', detail: 'int(x=0) -> int', doc: 'Convert number or string to integer.' },
  { name: 'float', insertText: 'float(${1})', detail: 'float(x=0) -> float', doc: 'Convert number or string to float.' },
];

export function registerMonacoLanguageProviders() {
  if (providersRegistered) return;
  providersRegistered = true;

  // 1. HTML Snippets, Full Tag Completions (<h -> <h1></h1>) & Emmet
  monaco.languages.registerCompletionItemProvider('html', {
    triggerCharacters: ['<', '!', '.', '#', '>', '*', ':'],
    provideCompletionItems(model, position) {
      const linePrefix = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const word = model.getWordUntilPosition(position);
      const defaultRange: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: monaco.languages.CompletionItem[] = [];

      // Case A: User started <! or <!d or <!DOCTYPE... -> Offer full HTML5 Document
      const doctypeMatch = linePrefix.match(/<!([a-zA-Z ]*)$/);
      if (doctypeMatch) {
        const startCol = position.column - doctypeMatch[1].length;
        suggestions.push({
          label: '!DOCTYPE html',
          filterText: 'DOCTYPE html',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'HTML5 Document',
          insertText: HTML5_BOILERPLATE.replace(/^<!/, ''),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: startCol,
            endColumn: position.column,
          },
          sortText: '0000_0doctype',
          preselect: true,
        });
        return { suggestions };
      }

      // Case B: User typed < or <h or <div (opening tag completion with full closing tag!)
      const openTagMatch = linePrefix.match(/<([a-zA-Z0-9]*)$/);
      if (openTagMatch) {
        const typed = openTagMatch[1];
        const startCol = position.column - typed.length;
        const tagRange: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: startCol,
          endColumn: position.column,
        };

        // Include !DOCTYPE html when `<` is typed
        if (typed === '') {
          suggestions.push({
            label: '!DOCTYPE html',
            filterText: '!DOCTYPE html',
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: 'HTML5 Document',
            insertText: HTML5_BOILERPLATE.slice(1),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: tagRange,
            sortText: '0000_0doctype',
          });
        }

        for (const t of ALL_HTML_TAGS) {
          suggestions.push({
            label: t.tag,
            filterText: t.tag,
            kind: monaco.languages.CompletionItemKind.Property,
            detail: isVoidHtmlTag(t.tag) ? `<${t.tag} />` : `<${t.tag}></${t.tag}>`,
            insertText: t.snippetHtml.slice(1),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: tagRange,
            sortText: `0000_${t.tag}`,
            preselect: typed.length > 0 && t.tag.startsWith(typed.toLowerCase()),
          });
        }

        return { suggestions };
      }

      // Case C: Bare !, html5, html:5, doc, doctype (without <) -> Full HTML5 boilerplate
      const bangMatch = linePrefix.match(/(?:^|\s)(!|html5|html:5|doc|doctype)$/);
      if (bangMatch) {
        const startCol = position.column - bangMatch[1].length;
        suggestions.push({
          label: bangMatch[1],
          filterText: bangMatch[1],
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'HTML5 Document',
          insertText: HTML5_BOILERPLATE,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: startCol,
            endColumn: position.column,
          },
          sortText: '0000',
          preselect: true,
        });
      }

      // Case D: Emmet abbreviation (e.g. h1, div.card, ul>li*3, input:email)
      const emmetMatch = linePrefix.match(/(?:^|\s)([a-zA-Z.#][a-zA-Z0-9.#\-_*>:]*)$/);
      if (emmetMatch) {
        const abbr = emmetMatch[1];
        const expanded = expandEmmetAbbreviation(abbr, false);
        if (expanded) {
          suggestions.push({
            label: expanded.label,
            filterText: abbr,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: 'Emmet Abbreviation',
            insertText: expanded.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column - abbr.length,
              endColumn: position.column,
            },
            sortText: '0001',
            preselect: true,
          });
        }
      }

      // Common HTML shortcut snippets
      const htmlSnippets: Array<[string, string, string]> = [
        ['html5', HTML5_BOILERPLATE, 'Full HTML5 Document'],
        ['doctype', HTML5_BOILERPLATE, 'Full HTML5 Document'],
        ['link:css', '<link rel="stylesheet" href="${1:style.css}" />$0', 'Link external stylesheet'],
        ['script:src', '<script src="${1:app.js}"></script>$0', 'External JavaScript tag'],
        ['a:blank', '<a href="${1:https://}" target="_blank" rel="noopener noreferrer">${2:Link}</a>$0', 'External link opening in new tab'],
        ['btn', '<button type="${1:button}">${2:Click me}</button>$0', 'Button element'],
      ];

      for (const [label, insertText, detail] of htmlSnippets) {
        suggestions.push({
          label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail,
          insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: defaultRange,
        });
      }

      return { suggestions };
    },
  });

  // 2. JS / TS / JSX / TSX Snippets, Tag Completions (<h -> <h1></h1>), Emmet & Workspace Imports
  for (const langId of ['typescript', 'javascript'] as const) {
    monaco.languages.registerCompletionItemProvider(langId, {
      triggerCharacters: ['<', '/', '.', "'", '"'],
      provideCompletionItems(model, position) {
        const linePrefix = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const word = model.getWordUntilPosition(position);
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const isJsxFile =
          model.uri.path.endsWith('.tsx') || model.uri.path.endsWith('.jsx');

        const suggestions: monaco.languages.CompletionItem[] = [];

        // Relative import path autocomplete from workspace files
        const importMatch = linePrefix.match(/(?:from|import)\s+['"](\.[^'"]*)$/);
        if (importMatch) {
          const currentPath = model.uri.path.replace(/^\/+/, '');
          const currentDirParts = currentPath.split('/').slice(0, -1);

          for (const node of workspaceNodesRef) {
            if (node.type !== 'file') continue;
            const targetPath = getNodePath(workspaceNodesRef, node.id);
            if (!targetPath || targetPath === currentPath) continue;

            const targetParts = targetPath.split('/');
            let common = 0;
            while (
              common < currentDirParts.length &&
              common < targetParts.length - 1 &&
              currentDirParts[common] === targetParts[common]
            ) {
              common++;
            }
            const upCount = currentDirParts.length - common;
            const relPrefix = upCount === 0 ? './' : '../'.repeat(upCount);
            const relPath = (relPrefix + targetParts.slice(common).join('/')).replace(
              /\.(ts|tsx|js|jsx)$/,
              ''
            );

            suggestions.push({
              label: relPath,
              kind: monaco.languages.CompletionItemKind.File,
              detail: `Workspace file (${targetPath})`,
              insertText: relPath,
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column - importMatch[1].length,
                endColumn: position.column,
              },
              sortText: '0000',
            });
          }
          return { suggestions };
        }

        // JSX opening tag completion (<h -> <h1>$0</h1>) in .tsx / .jsx files
        const openJsxTagMatch = linePrefix.match(/(?:^|[\s(>?:=])<([a-zA-Z0-9]*)$/);
        if (isJsxFile && openJsxTagMatch) {
          const typed = openJsxTagMatch[1];
          const startCol = position.column - typed.length;
          const tagRange: monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: startCol,
            endColumn: position.column,
          };

          for (const t of ALL_HTML_TAGS) {
            const snippet = t.snippetJsx || t.snippetHtml;
            suggestions.push({
              label: t.tag,
              filterText: t.tag,
              kind: monaco.languages.CompletionItemKind.Property,
              detail: isVoidHtmlTag(t.tag) ? `<${t.tag} />` : `<${t.tag}></${t.tag}>`,
              insertText: snippet.slice(1),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: tagRange,
              sortText: `0000_${t.tag}`,
              preselect: typed.length > 0 && t.tag.startsWith(typed.toLowerCase()),
            });
          }
          return { suggestions };
        }

        // JSX Emmet support (e.g. div.flex, h1, ul>li*3)
        const emmetMatch = linePrefix.match(/(?:^|\s)([a-zA-Z.#][a-zA-Z0-9.#\-_*>:]*)$/);
        if (isJsxFile && emmetMatch) {
          const abbr = emmetMatch[1];
          if (
            abbr.includes('.') ||
            abbr.includes('#') ||
            abbr.includes('>') ||
            abbr.includes('*') ||
            ALL_HTML_TAG_NAMES.has(abbr.toLowerCase())
          ) {
            const expanded = expandEmmetAbbreviation(abbr, true);
            if (expanded) {
              suggestions.push({
                label: expanded.label,
                filterText: abbr,
                kind: monaco.languages.CompletionItemKind.Snippet,
                detail: 'JSX Emmet',
                insertText: expanded.insertText,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column - abbr.length,
                  endColumn: position.column,
                },
                sortText: '0001',
              });
            }
          }
        }

        const rawFileName =
          model.uri.path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Component';
        const compName = rawFileName.replace(/[^a-zA-Z0-9]/g, '') || 'Component';

        const codeSnippets: Array<[string, string, string]> = [
          ['log', 'console.log(${1:value});$0', 'Print to console'],
          ['clg', 'console.log(${1:value});$0', 'Console log snippet'],
          ['warn', 'console.warn(${1:warning});$0', 'Console warn'],
          ['err', 'console.error(${1:error});$0', 'Console error'],
          [
            'rafce',
            `import React from 'react';\n\nexport const \${1:${compName}} = () => {\n\treturn (\n\t\t<div>\n\t\t\t\$0\n\t\t</div>\n\t);\n};\n`,
            'React Arrow Function Export Component',
          ],
          [
            'rfc',
            `import React from 'react';\n\nexport default function \${1:${compName}}() {\n\treturn (\n\t\t<div>\n\t\t\t\$0\n\t\t</div>\n\t);\n}\n`,
            'React Functional Component',
          ],
          [
            'useState',
            'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});$0',
            'React useState Hook',
          ],
          [
            'useEffect',
            'useEffect(() => {\n\t$1\n\treturn () => {\n\t\t$2\n\t};\n}, [${3}]);$0',
            'React useEffect Hook',
          ],
          [
            'useMemo',
            'const ${1:memoized} = useMemo(() => {\n\treturn ${2:value};\n}, [${3}]);$0',
            'React useMemo Hook',
          ],
          [
            'useCallback',
            'const ${1:callback} = useCallback((${2}) => {\n\t$0\n}, [${3}]);',
            'React useCallback Hook',
          ],
          ['useRef', 'const ${1:ref} = useRef<${2:HTMLDivElement | null}>(${3:null});$0', 'React useRef Hook'],
          ['fn', 'function ${1:name}(${2:params}) {\n\t$0\n}', 'Function declaration'],
          ['afn', 'const ${1:name} = (${2:params}) => {\n\t$0\n};', 'Arrow function'],
          ['asyncfn', 'async function ${1:name}(${2:params}) {\n\ttry {\n\t\t$0\n\t} catch (err) {\n\t\tconsole.error(err);\n\t}\n}', 'Async function with try/catch'],
          ['trycatch', 'try {\n\t$1\n} catch (${2:error}) {\n\t$0\n}', 'Try / Catch block'],
          ['for', 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\tconst ${3:item} = ${2:array}[${1:i}];\n\t$0\n}', 'For loop'],
          ['forof', 'for (const ${1:item} of ${2:iterable}) {\n\t$0\n}', 'For...of loop'],
          ['foreach', '${1:array}.forEach((${2:item}) => {\n\t$0\n});', 'Array forEach'],
          ['map', '${1:array}.map((${2:item}) => {\n\treturn $0;\n})', 'Array map'],
          ['imp', "import { $2 } from '$1';$0", 'ES Module import'],
          ['iface', 'export interface ${1:Name} {\n\t${2:id}: ${3:string};\n\t$0\n}', 'TypeScript Interface'],
          ['type', 'export type ${1:Name} = {\n\t${2:key}: ${3:string};\n};$0', 'TypeScript Type Alias'],
          ['fetch', "const response = await fetch('${1:/api/endpoint}');\nconst ${2:data} = await response.json();\n$0", 'Fetch JSON helper'],
        ];

        for (const [label, insertText, detail] of codeSnippets) {
          suggestions.push({
            label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail,
            insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          });
        }

        return { suggestions };
      },
    });
  }

  // 3. CSS Snippets & Emmet CSS Abbreviations
  monaco.languages.registerCompletionItemProvider('css', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const cssSnippets: Array<[string, string, string]> = [
        ['df', 'display: flex;$0', 'display: flex'],
        ['dg', 'display: grid;$0', 'display: grid'],
        ['db', 'display: block;$0', 'display: block'],
        ['dib', 'display: inline-block;$0', 'display: inline-block'],
        ['dn', 'display: none;$0', 'display: none'],
        ['jcc', 'justify-content: center;$0', 'justify-content: center'],
        ['jcsb', 'justify-content: space-between;$0', 'justify-content: space-between'],
        ['aic', 'align-items: center;$0', 'align-items: center'],
        ['fxdc', 'flex-direction: column;$0', 'flex-direction: column'],
        ['posa', 'position: absolute;$0', 'position: absolute'],
        ['posr', 'position: relative;$0', 'position: relative'],
        ['posf', 'position: fixed;$0', 'position: fixed'],
        ['tac', 'text-align: center;$0', 'text-align: center'],
        ['bgc', 'background-color: ${1:#ffffff};$0', 'background-color'],
        ['fz', 'font-size: ${1:16px};$0', 'font-size'],
        ['fw', 'font-weight: ${1:600};$0', 'font-weight'],
        ['br', 'border-radius: ${1:8px};$0', 'border-radius'],
        ['w100', 'width: 100%;$0', 'width: 100%'],
        ['h100', 'height: 100%;$0', 'height: 100%'],
        ['flex-center', 'display: flex;\nalign-items: center;\njustify-content: center;$0', 'Flexbox centered container'],
        ['flex-col', 'display: flex;\nflex-direction: column;\ngap: ${1:12px};$0', 'Vertical flex stack'],
        ['grid-cols', 'display: grid;\ngrid-template-columns: repeat(${1:3}, minmax(0, 1fr));\ngap: ${2:16px};$0', 'Responsive CSS Grid'],
        ['media', '@media (max-width: ${1:768px}) {\n\t$0\n}', 'Responsive media query'],
        ['keyframes', '@keyframes ${1:fadeIn} {\n\tfrom {\n\t\topacity: 0;\n\t}\n\tto {\n\t\topacity: 1;\n\t}\n}$0', 'CSS Keyframes animation'],
        ['root', ':root {\n\t--${1:primary}: ${2:#0078d4};\n}$0', 'CSS Custom Properties'],
        ['reset', '*,\n*::before,\n*::after {\n\tbox-sizing: border-box;\n\tmargin: 0;\n\tpadding: 0;\n}$0', 'CSS Box-sizing reset'],
      ];

      return {
        suggestions: cssSnippets.map(([label, insertText, detail]) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail,
          insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
      };
    },
  });

  // 4. Python IntelliSense (Keywords + Built-ins + Snippets + Hover)
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const pyKeywords = [
        'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
        'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
        'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
        'lambda', 'match', 'case', 'nonlocal', 'not', 'or', 'pass', 'raise',
        'return', 'try', 'while', 'with', 'yield',
      ];

      const pySnippets: Array<[string, string, string]> = [
        ['def', 'def ${1:function_name}(${2:args}) -> ${3:None}:\n\t${4:pass}$0', 'Define a Python function'],
        ['adef', 'async def ${1:function_name}(${2:args}) -> ${3:None}:\n\t${4:pass}$0', 'Define an async Python function'],
        ['class', 'class ${1:ClassName}:\n\tdef __init__(self${2:, arg}):\n\t\t${3:pass}$0', 'Define a Python class'],
        ['ifmain', 'if __name__ == "__main__":\n\t${1:main()}$0', 'Main entry point guard'],
        ['for', 'for ${1:item} in ${2:iterable}:\n\t$0', 'For loop'],
        ['try', 'try:\n\t$1\nexcept ${2:Exception} as ${3:e}:\n\t${4:print(e)}$0', 'Try / Except block'],
        ['withopen', 'with open("${1:file.txt}", "${2:r}", encoding="utf-8") as ${3:f}:\n\t${4:data = f.read()}$0', 'Context-managed file read/write'],
        ['dataclass', 'from dataclasses import dataclass\n\n@dataclass\nclass ${1:Item}:\n\t${2:name}: ${3:str}$0', 'Python dataclass'],
      ];

      const suggestions: monaco.languages.CompletionItem[] = [
        ...PYTHON_BUILTINS.map((b) => ({
          label: b.name,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: b.detail,
          documentation: b.doc,
          insertText: b.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
        ...pySnippets.map(([label, insertText, detail]) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail,
          insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
        ...pyKeywords.map((kw) => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        })),
      ];

      return { suggestions };
    },
  });

  monaco.languages.registerHoverProvider('python', {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const found = PYTHON_BUILTINS.find((b) => b.name === word.word);
      if (!found) return null;
      return {
        range: new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        ),
        contents: [
          { value: `\`\`\`python\n${found.detail}\n\`\`\`` },
          { value: found.doc },
        ],
      };
    },
  });

  // 5. Document Formatting Provider inside Monaco (Right-click -> Format Document / Shift+Alt+F)
  const formattableLangs = ['typescript', 'javascript', 'html', 'css', 'json', 'python'] as const;
  for (const langId of formattableLangs) {
    monaco.languages.registerDocumentFormattingEditProvider(langId, {
      provideDocumentFormattingEdits(model, options) {
        const mappedLang =
          langId === 'typescript'
            ? model.uri.path.endsWith('.tsx')
              ? 'tsx'
              : 'typescript'
            : langId === 'javascript'
            ? model.uri.path.endsWith('.jsx')
              ? 'jsx'
              : 'javascript'
            : langId;
        const formatted = formatCode(model.getValue(), mappedLang, options.tabSize || 2);
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      },
    });
  }
}
