import { detectLanguage } from '../data/initialWorkspace';
import { FSNode } from '../types/ide';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.cache',
  '__pycache__',
  '.venv',
  'venv',
]);

const JUNK_FILES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

const BINARY_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'avif',
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a',
  'mp4', 'webm', 'mov', 'avi', 'mkv',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'tar', 'gz', 'tgz', 'bz2', '7z', 'rar', 'xz',
  'exe', 'dll', 'so', 'dylib', 'bin', 'apk', 'aab', 'ipa', 'wasm',
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  'db', 'sqlite', 'sqlite3', 'class', 'jar', 'pyc', 'o', 'a',
]);

const MAX_TEXT_FILE_BYTES = 1_000_000; // 1 MB per file

let idCounter = 0;
function nextNodeId(prefix: 'file' | 'folder'): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Safely decodes URI percent-encoded names/paths (common in Android DocumentsUI / SAF)
 * and strips Android Storage Access Framework volume prefixes like `primary:`, `raw:`, etc.
 */
export function cleanPathString(raw: string): string {
  let decoded = raw;
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(decoded)) break;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  // Normalize slashes
  let normalized = decoded.replace(/\\/g, '/').replace(/\/+/g, '/').trim();

  // Strip common Android SAF URI path wrappers
  normalized = normalized
    .replace(/^\/?tree\/[^/]+\//i, '')
    .replace(/^\/?document\//i, '')
    .replace(/^\/?raw:\/storage\/emulated\/\d+\//i, '')
    .replace(/^\/?raw:/i, '')
    .replace(/^(?:primary|home|msf|[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}):/i, '');

  return normalized.replace(/^\/+|\/+$/g, '');
}

export function cleanNodeName(rawName: string): string {
  const cleaned = cleanPathString(rawName);
  const parts = cleaned.split('/').filter(Boolean);
  return parts[parts.length - 1] || rawName;
}

function isJunkFile(name: string): boolean {
  const lower = name.toLowerCase();
  return JUNK_FILES.has(lower) || lower.startsWith('._');
}

async function isReadableTextFile(file: File, cleanName: string): Promise<boolean> {
  if (isJunkFile(cleanName)) return false;
  if (file.size > MAX_TEXT_FILE_BYTES) return false;

  const dotIdx = cleanName.lastIndexOf('.');
  if (dotIdx > 0) {
    const ext = cleanName.slice(dotIdx + 1).toLowerCase();
    if (BINARY_EXTS.has(ext)) return false;
  }

  if (file.size === 0) return true;

  // Sniff first 1024 bytes for null bytes (binary detection)
  try {
    const sample = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export interface LoadedWorkspaceResult {
  workspaceName: string;
  nodes: FSNode[];
  fileHandles?: Record<string, FileSystemFileHandle>;
  skippedCount: number;
  hasRelativePaths: boolean;
}

function createFolderEnsurer(nodes: FSNode[]) {
  const folderMap = new Map<string, string>();
  return (segments: string[]): string | null => {
    let parentId: string | null = null;
    let accum = '';
    for (const seg of segments) {
      if (!seg || seg === '.' || seg === '..') continue;
      accum = accum ? `${accum}/${seg}` : seg;
      const existing = folderMap.get(accum);
      if (existing) {
        parentId = existing;
      } else {
        const id = nextNodeId('folder');
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
}

/**
 * Loads a local directory using the native File System Access API (`window.showDirectoryPicker`).
 * Produces clean OS file/folder names, preserves empty folders, and keeps file handles for Ctrl+S saving.
 */
export async function loadDirectoryFromHandle(
  rootHandle: FileSystemDirectoryHandle
): Promise<LoadedWorkspaceResult> {
  const nodes: FSNode[] = [];
  const fileHandles: Record<string, FileSystemFileHandle> = {};
  let skippedCount = 0;

  async function walk(
    dirHandle: FileSystemDirectoryHandle,
    parentId: string | null,
    depth: number
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const [, entry] of (dirHandle as any).entries()) {
      const name = cleanNodeName(entry.name);
      if (!name) continue;

      if (entry.kind === 'directory') {
        if (IGNORED_DIRS.has(name) || name.startsWith('.git')) {
          skippedCount += 1;
          continue;
        }
        const folderId = nextNodeId('folder');
        nodes.push({
          id: folderId,
          name,
          type: 'folder',
          parentId,
          isOpen: depth < 2,
        });
        await walk(entry as FileSystemDirectoryHandle, folderId, depth + 1);
      } else if (entry.kind === 'file') {
        try {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          const ok = await isReadableTextFile(file, name);
          if (!ok) {
            skippedCount += 1;
            continue;
          }
          const content = await file.text();
          const fileId = nextNodeId('file');
          nodes.push({
            id: fileId,
            name,
            type: 'file',
            parentId,
            language: detectLanguage(name),
            content,
          });
          fileHandles[fileId] = fileHandle;
        } catch {
          skippedCount += 1;
        }
      }
    }
  }

  await walk(rootHandle, null, 0);

  return {
    workspaceName: cleanNodeName(rootHandle.name) || 'local-project',
    nodes,
    fileHandles,
    skippedCount,
    hasRelativePaths: true,
  };
}

/**
 * Loads files from `<input type="file" webkitdirectory />` or `<input type="file" multiple />`.
 * Safely normalizes and decodes Android/iOS/Desktop paths and handles empty `webkitRelativePath`.
 */
export async function loadDirectoryFromFileList(
  fileList: FileList | File[]
): Promise<LoadedWorkspaceResult> {
  const nodes: FSNode[] = [];
  const ensureFolder = createFolderEnsurer(nodes);
  const files = Array.from(fileList);

  let skippedCount = 0;
  let rootName = 'workspace';
  let hasRelativePaths = false;

  // Detect common root folder from webkitRelativePath when available
  const decodedPaths = files.map((file) => {
    const rawRel = file.webkitRelativePath ? cleanPathString(file.webkitRelativePath) : '';
    const rawName = cleanNodeName(file.name);
    if (rawRel && rawRel.includes('/')) {
      hasRelativePaths = true;
    }
    return { file, rel: rawRel, name: rawName };
  });

  if (hasRelativePaths) {
    const firstWithSlash = decodedPaths.find((item) => item.rel.includes('/'));
    if (firstWithSlash) {
      const candidate = firstWithSlash.rel.split('/').filter(Boolean)[0];
      if (candidate) rootName = candidate;
    }
  }

  for (const item of decodedPaths) {
    const { file, rel, name } = item;
    let folderParts: string[] = [];
    let fileName = name;

    if (rel && rel.includes('/')) {
      const segments = rel.split('/').filter(Boolean);
      if (segments.length > 1 && segments[0] === rootName) {
        segments.shift(); // drop shared root folder name
      }
      if (segments.some((p) => IGNORED_DIRS.has(p))) {
        skippedCount += 1;
        continue;
      }
      fileName = segments.pop() || name;
      folderParts = segments;
    }

    if (!fileName || isJunkFile(fileName)) {
      skippedCount += 1;
      continue;
    }

    const ok = await isReadableTextFile(file, fileName);
    if (!ok) {
      skippedCount += 1;
      continue;
    }

    const parentId = folderParts.length > 0 ? ensureFolder(folderParts) : null;
    const content = await file.text();
    nodes.push({
      id: nextNodeId('file'),
      name: fileName,
      type: 'file',
      parentId,
      language: detectLanguage(fileName),
      content,
    });
  }

  return {
    workspaceName: rootName,
    nodes,
    skippedCount,
    hasRelativePaths,
  };
}

/**
 * Loads folders or files dropped onto the workbench via `DataTransferItemList`.
 */
export async function loadFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<LoadedWorkspaceResult | null> {
  const items = Array.from(dataTransfer.items || []);
  const entries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => Boolean(e));

  if (entries.length === 0) {
    if (dataTransfer.files && dataTransfer.files.length > 0) {
      return loadDirectoryFromFileList(dataTransfer.files);
    }
    return null;
  }

  const nodes: FSNode[] = [];
  let skippedCount = 0;
  const singleRootDir = entries.length === 1 && entries[0].isDirectory ? entries[0] : null;
  const workspaceName = singleRootDir ? cleanNodeName(singleRootDir.name) : 'workspace';

  async function readEntry(entry: FileSystemEntry, parentId: string | null, depth: number) {
    const name = cleanNodeName(entry.name);
    if (!name) return;

    if (entry.isDirectory) {
      if (IGNORED_DIRS.has(name)) {
        skippedCount += 1;
        return;
      }
      const folderId = nextNodeId('folder');
      nodes.push({
        id: folderId,
        name,
        type: 'folder',
        parentId,
        isOpen: depth < 2,
      });

      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const children = await new Promise<FileSystemEntry[]>((resolve) => {
        const all: FileSystemEntry[] = [];
        const readBatch = () => {
          reader.readEntries(
            (batch) => {
              if (batch.length === 0) resolve(all);
              else {
                all.push(...batch);
                readBatch();
              }
            },
            () => resolve(all)
          );
        };
        readBatch();
      });

      for (const child of children) {
        await readEntry(child, folderId, depth + 1);
      }
    } else if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File | null>((resolve) => {
        fileEntry.file(resolve, () => resolve(null));
      });
      if (!file) {
        skippedCount += 1;
        return;
      }
      const ok = await isReadableTextFile(file, name);
      if (!ok) {
        skippedCount += 1;
        return;
      }
      const content = await file.text();
      nodes.push({
        id: nextNodeId('file'),
        name,
        type: 'file',
        parentId,
        language: detectLanguage(name),
        content,
      });
    }
  }

  if (singleRootDir) {
    const reader = (singleRootDir as FileSystemDirectoryEntry).createReader();
    const children = await new Promise<FileSystemEntry[]>((resolve) => {
      const all: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries(
          (batch) => {
            if (batch.length === 0) resolve(all);
            else {
              all.push(...batch);
              readBatch();
            }
          },
          () => resolve(all)
        );
      };
      readBatch();
    });
    for (const child of children) {
      await readEntry(child, null, 0);
    }
  } else {
    for (const entry of entries) {
      await readEntry(entry, null, 0);
    }
  }

  return {
    workspaceName,
    nodes,
    skippedCount,
    hasRelativePaths: true,
  };
}
