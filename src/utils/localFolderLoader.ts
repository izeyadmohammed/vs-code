import { detectLanguage } from '../data/initialWorkspace';
import { FSNode } from '../types/ide';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.turbo']);
const TEXT_EXTS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'html', 'htm', 'css', 'scss',
  'md', 'markdown', 'py', 'txt', 'yml', 'yaml', 'env', 'svg', 'xml', 'sql', 'sh',
]);

function isLikelyTextFile(name: string): boolean {
  if (name.startsWith('.env') || name === '.gitignore' || name === 'Dockerfile') return true;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return TEXT_EXTS.has(ext);
}

export async function loadDirectoryFromFileList(fileList: FileList): Promise<{
  workspaceName: string;
  nodes: FSNode[];
}> {
  const nodes: FSNode[] = [];
  const folderMap = new Map<string, string>(); // relFolderPath -> id
  let rootName = 'local-project';

  const files = Array.from(fileList);
  if (files.length > 0 && files[0].webkitRelativePath) {
    rootName = files[0].webkitRelativePath.split('/')[0] || rootName;
  }

  const ensureFolder = (segments: string[]): string | null => {
    let parentId: string | null = null;
    let accum = '';
    for (const seg of segments) {
      accum = accum ? `${accum}/${seg}` : seg;
      if (folderMap.has(accum)) {
        parentId = folderMap.get(accum)!;
      } else {
        const id = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        nodes.push({
          id,
          name: seg,
          type: 'folder',
          parentId,
          isOpen: segments.length <= 2,
        });
        folderMap.set(accum, id);
        parentId = id;
      }
    }
    return parentId;
  };

  for (const file of files) {
    const rel = file.webkitRelativePath || file.name;
    const parts = rel.split('/');
    if (parts.length > 1) parts.shift(); // drop root folder name
    if (parts.some((p) => IGNORED_DIRS.has(p))) continue;

    const fileName = parts.pop()!;
    if (!isLikelyTextFile(fileName) || file.size > 300_000) continue;

    const parentId = ensureFolder(parts);
    const content = await file.text();
    nodes.push({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: fileName,
      type: 'file',
      parentId,
      language: detectLanguage(fileName),
      content,
    });
  }

  return { workspaceName: rootName, nodes };
}
