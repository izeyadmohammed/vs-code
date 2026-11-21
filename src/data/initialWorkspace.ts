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

export const INITIAL_FILES: FSNode[] = [];

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
