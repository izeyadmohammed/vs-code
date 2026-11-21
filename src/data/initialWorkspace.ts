import { ExtensionItem, FileLanguage, FSNode } from '../types/ide';

export function detectLanguage(filename: string): FileLanguage {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'tsx';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'jsx':
      return 'jsx';
    case 'html':
    case 'htm':
    case 'svg':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'py':
      return 'python';
    default:
      return 'plaintext';
  }
}

export function getLanguageLabel(lang?: FileLanguage): string {
  switch (lang) {
    case 'typescript':
      return 'TypeScript';
    case 'tsx':
      return 'TypeScript React';
    case 'javascript':
      return 'JavaScript';
    case 'jsx':
      return 'JavaScript React';
    case 'html':
      return 'HTML';
    case 'css':
      return 'CSS';
    case 'json':
      return 'JSON';
    case 'markdown':
      return 'Markdown';
    case 'python':
      return 'Python';
    default:
      return 'Plain Text';
  }
}

export const INITIAL_FILES: FSNode[] = [
  {
    id: 'folder-src',
    name: 'src',
    type: 'folder',
    parentId: null,
    isOpen: true,
  },
  {
    id: 'folder-components',
    name: 'components',
    type: 'folder',
    parentId: 'folder-src',
    isOpen: true,
  },
  {
    id: 'folder-utils',
    name: 'utils',
    type: 'folder',
    parentId: 'folder-src',
    isOpen: false,
  },
  {
    id: 'folder-styles',
    name: 'styles',
    type: 'folder',
    parentId: 'folder-src',
    isOpen: false,
  },
  {
    id: 'file-app-tsx',
    name: 'App.tsx',
    type: 'file',
    parentId: 'folder-src',
    language: 'tsx',
    content: `import React, { useState, useMemo } from 'react';
import { TaskCard } from './components/TaskCard';
import { calculateVelocity } from './utils/metrics';

export interface SprintTask {
  id: string;
  title: string;
  points: number;
  status: 'todo' | 'in-progress' | 'done';
}

const INITIAL_TASKS: SprintTask[] = [
  { id: 'T-101', title: 'Implement syntax tokenizer', points: 5, status: 'done' },
  { id: 'T-102', title: 'Wire integrated terminal shell', points: 8, status: 'in-progress' },
  { id: 'T-103', title: 'Add multi-cursor & split editor', points: 3, status: 'todo' },
];

export default function App() {
  const [tasks, setTasks] = useState<SprintTask[]>(INITIAL_TASKS);
  const [filter, setFilter] = useState<'all' | SprintTask['status']>('all');

  const visibleTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((item) => item.status === filter);
  }, [tasks, filter]);

  const velocity = calculateVelocity(tasks);

  const toggleStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, status: task.status === 'done' ? 'todo' : 'done' }
          : task
      )
    );
  };

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <h1>Sprint Board</h1>
        <span>Completed Velocity: {velocity} pts</span>
      </header>
      <section className="task-grid">
        {visibleTasks.map((task) => (
          <TaskCard key={task.id} task={task} onToggle={toggleStatus} />
        ))}
      </section>
    </main>
  );
}
`,
  },
  {
    id: 'file-task-card',
    name: 'TaskCard.tsx',
    type: 'file',
    parentId: 'folder-components',
    language: 'tsx',
    content: `import React from 'react';
import type { SprintTask } from '../App';

interface TaskCardProps {
  task: SprintTask;
  onToggle: (id: string) => void;
}

export function TaskCard({ task, onToggle }: TaskCardProps) {
  const isComplete = task.status === 'done';

  return (
    <article className="task-card" data-status={task.status}>
      <div className="task-meta">
        <span>{task.id}</span>
        <span>{task.points} pts</span>
      </div>
      <h3>{task.title}</h3>
      <button type="button" onClick={() => onToggle(task.id)}>
        {isComplete ? 'Reopen Task' : 'Mark Complete'}
      </button>
    </article>
  );
}
`,
  },
  {
    id: 'file-metrics-ts',
    name: 'metrics.ts',
    type: 'file',
    parentId: 'folder-utils',
    language: 'typescript',
    content: `import type { SprintTask } from '../App';

/**
 * Computes completed story points for the active sprint.
 */
export function calculateVelocity(tasks: SprintTask[]): number {
  return tasks
    .filter((task) => task.status === 'done')
    .reduce((total, task) => total + task.points, 0);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return \`\${mins}m \${secs.toString().padStart(2, '0')}s\`;
}
`,
  },
  {
    id: 'file-demo-js',
    name: 'playground.js',
    type: 'file',
    parentId: 'folder-src',
    language: 'javascript',
    content: `// Try running this file with: node src/playground.js
// Or press "Run Active File" in the Run & Debug sidebar!

function fibonacci(limit) {
  const sequence = [0, 1];
  for (let i = 2; i < limit; i++) {
    sequence.push(sequence[i - 1] + sequence[i - 2]);
  }
  return sequence;
}

const series = fibonacci(10);
console.log('Fibonacci (10 terms):', series.join(', '));

const sum = series.reduce((acc, n) => acc + n, 0);
console.log('Total sum:', sum);
`,
  },
  {
    id: 'file-styles-css',
    name: 'main.css',
    type: 'file',
    parentId: 'folder-styles',
    language: 'css',
    content: `:root {
  --surface-canvas: #0d1117;
  --surface-card: #161b22;
  --text-primary: #e6edf3;
  --accent-blue: #2f81f7;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: var(--surface-canvas);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, sans-serif;
}

.workspace-shell {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px;
}

.task-card {
  background: var(--surface-card);
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
}
`,
  },
  {
    id: 'file-index-html',
    name: 'index.html',
    type: 'file',
    parentId: null,
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Aurora Preview App</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0f172a;
      color: #f8fafc;
      font-family: system-ui, sans-serif;
    }
    .card {
      padding: 28px 32px;
      border-radius: 12px;
      background: #1e293b;
      border: 1px solid #334155;
      max-width: 420px;
      text-align: center;
    }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0 0 18px; color: #94a3b8; font-size: 14px; line-height: 1.5; }
    button {
      background: #0078d4;
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #026ec1; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Live HTML Preview</h1>
    <p>Edit <code>index.html</code> in VS Code Web and click the Preview icon in the tab bar to see instant updates.</p>
    <button onclick="document.getElementById('count').textContent = Number(document.getElementById('count').textContent) + 1">
      Clicks: <span id="count">0</span>
    </button>
  </div>
</body>
</html>
`,
  },
  {
    id: 'file-package-json',
    name: 'package.json',
    type: 'file',
    parentId: null,
    language: 'json',
    content: `{
  "name": "aurora-workspace",
  "version": "1.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.1",
    "react-dom": "^19.0.1"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "vite": "^6.2.0"
  }
}
`,
  },
  {
    id: 'file-readme-md',
    name: 'README.md',
    type: 'file',
    parentId: null,
    language: 'markdown',
    content: `# Aurora Workspace

Welcome to **Visual Studio Code Web Workbench**.

## Keyboard Shortcuts
- \`Ctrl+P\` / \`Cmd+P\` — Quick Open file
- \`Ctrl+Shift+P\` / \`F1\` — Command Palette
- \`Ctrl+B\` — Toggle Primary Side Bar
- \`Ctrl+J\` / \`Ctrl+\`\` — Toggle Bottom Panel / Terminal
- \`Ctrl+S\` — Save Active File
- \`Ctrl+F\` — Find & Replace in Editor
- \`Ctrl+\\\` — Split Editor Right

## Terminal Commands
Open the integrated terminal and try:
\`\`\`bash
ls
cat package.json
node src/playground.js
git status
npm test
\`\`\`
`,
  },
  {
    id: 'file-python-py',
    name: 'analyze.py',
    type: 'file',
    parentId: 'folder-utils',
    language: 'python',
    content: `from dataclasses import dataclass
from typing import List


@dataclass
class BenchmarkResult:
    name: str
    duration_ms: float


def summarize(results: List[BenchmarkResult]) -> float:
    if not results:
        return 0.0
    total = sum(item.duration_ms for item in results)
    return round(total / len(results), 2)


if __name__ == "__main__":
    samples = [
        BenchmarkResult("tokenize", 4.2),
        BenchmarkResult("parse_ast", 7.8),
        BenchmarkResult("emit_bundle", 11.4),
    ]
    print(f"Average phase duration: {summarize(samples)} ms")
`,
  },
];

export const INITIAL_EXTENSIONS: ExtensionItem[] = [
  {
    id: 'esbenp.prettier-vscode',
    name: 'Prettier - Code formatter',
    publisher: 'Prettier',
    description: 'Code formatter using prettier for TypeScript, JavaScript, JSON, CSS, and HTML.',
    version: '11.0.0',
    downloads: '52.4M',
    rating: 4.5,
    category: 'Formatters',
    installed: true,
    enabled: true,
    iconColor: '#f7b93e',
    shortTag: 'P',
  },
  {
    id: 'dbaeumer.vscode-eslint',
    name: 'ESLint',
    publisher: 'Microsoft',
    description: 'Integrates ESLint JavaScript & TypeScript diagnostics into VS Code.',
    version: '3.0.10',
    downloads: '39.8M',
    rating: 4.6,
    category: 'Linters',
    installed: true,
    enabled: true,
    iconColor: '#4b32c3',
    shortTag: 'ES',
  },
  {
    id: 'eamodio.gitlens',
    name: 'GitLens — Git supercharged',
    publisher: 'GitKraken',
    description: 'Supercharge Git within VS Code — visualize code authorship, diffs, and commit history.',
    version: '15.6.1',
    downloads: '34.1M',
    rating: 4.7,
    category: 'SCM Providers',
    installed: true,
    enabled: true,
    iconColor: '#a855f7',
    shortTag: 'GL',
  },
  {
    id: 'bradlc.vscode-tailwindcss',
    name: 'Tailwind CSS IntelliSense',
    publisher: 'Tailwind Labs',
    description: 'Intelligent Tailwind CSS tooling for VS Code with class previews and linting.',
    version: '0.12.8',
    downloads: '18.2M',
    rating: 4.8,
    category: 'Other',
    installed: false,
    enabled: false,
    iconColor: '#38bdf8',
    shortTag: 'TW',
  },
  {
    id: 'ritwickdey.liveserver',
    name: 'Live Server',
    publisher: 'Ritwick Dey',
    description: 'Launch a development local Server with live reload feature for static & dynamic pages.',
    version: '5.7.9',
    downloads: '49.1M',
    rating: 4.6,
    category: 'Other',
    installed: true,
    enabled: true,
    iconColor: '#ef4444',
    shortTag: 'LS',
  },
  {
    id: 'ms-python.python',
    name: 'Python',
    publisher: 'Microsoft',
    description: 'IntelliSense (Pylance), linting, debugging, code formatting, and refactoring for Python.',
    version: '2024.16.0',
    downloads: '142M',
    rating: 4.5,
    category: 'Programming Languages',
    installed: false,
    enabled: false,
    iconColor: '#3776ab',
    shortTag: 'Py',
  },
];
