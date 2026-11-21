import React from 'react';
import { Folder, FolderOpen, FileText } from 'lucide-react';
import { FileLanguage } from '../types/ide';

interface FileIconProps {
  name: string;
  language?: FileLanguage;
  isFolder?: boolean;
  isOpen?: boolean;
  size?: number;
}

export const FileIcon: React.FC<FileIconProps> = ({
  name,
  language,
  isFolder,
  isOpen,
  size = 15,
}) => {
  if (isFolder) {
    const lower = name.toLowerCase();
    let folderColor = '#dcb67a';
    if (lower === 'src') folderColor = '#60a5fa';
    else if (lower === 'components') folderColor = '#4ade80';
    else if (lower === 'utils') folderColor = '#a78bfa';
    else if (lower === 'styles') folderColor = '#38bdf8';

    return isOpen ? (
      <FolderOpen size={size} style={{ color: folderColor }} className="shrink-0" />
    ) : (
      <Folder size={size} style={{ color: folderColor }} className="shrink-0" />
    );
  }

  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'tsx' || ext === 'jsx' || language === 'tsx' || language === 'jsx') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0" aria-hidden="true">
        <circle cx="8" cy="8" r="1.5" fill="#61dafb" />
        <ellipse cx="8" cy="8" rx="6.5" ry="2.5" fill="none" stroke="#61dafb" strokeWidth="1.1" transform="rotate(30 8 8)" />
        <ellipse cx="8" cy="8" rx="6.5" ry="2.5" fill="none" stroke="#61dafb" strokeWidth="1.1" transform="rotate(-30 8 8)" />
        <ellipse cx="8" cy="8" rx="6.5" ry="2.5" fill="none" stroke="#61dafb" strokeWidth="1.1" transform="rotate(90 8 8)" />
      </svg>
    );
  }

  if (ext === 'ts' || language === 'typescript') {
    return (
      <span
        className="inline-flex items-center justify-center rounded-[2px] font-bold leading-none shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: '#3178c6',
          color: '#ffffff',
          fontSize: Math.max(8, Math.round(size * 0.56)),
        }}
      >
        TS
      </span>
    );
  }

  if (ext === 'js' || ext === 'mjs' || language === 'javascript') {
    return (
      <span
        className="inline-flex items-center justify-center rounded-[2px] font-bold leading-none shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: '#f7df1e',
          color: '#1e1e1e',
          fontSize: Math.max(8, Math.round(size * 0.56)),
        }}
      >
        JS
      </span>
    );
  }

  if (ext === 'html' || ext === 'htm' || language === 'html') {
    return (
      <span
        className="inline-flex items-center justify-center font-bold leading-none shrink-0"
        style={{
          width: size,
          height: size,
          color: '#e34c26',
          fontSize: Math.max(9, Math.round(size * 0.68)),
        }}
      >
        &lt;&gt;
      </span>
    );
  }

  if (ext === 'css' || ext === 'scss' || language === 'css') {
    return (
      <span
        className="inline-flex items-center justify-center font-bold leading-none shrink-0"
        style={{
          width: size,
          height: size,
          color: '#38bdf8',
          fontSize: Math.max(10, Math.round(size * 0.78)),
        }}
      >
        #
      </span>
    );
  }

  if (ext === 'json' || language === 'json') {
    return (
      <span
        className="inline-flex items-center justify-center font-bold leading-none shrink-0"
        style={{
          width: size,
          height: size,
          color: '#facc15',
          fontSize: Math.max(9, Math.round(size * 0.68)),
        }}
      >
        {'{}'}
      </span>
    );
  }

  if (ext === 'md' || language === 'markdown') {
    return (
      <span
        className="inline-flex items-center justify-center font-bold leading-none shrink-0"
        style={{
          width: size,
          height: size,
          color: '#60a5fa',
          fontSize: Math.max(8, Math.round(size * 0.6)),
        }}
      >
        M↓
      </span>
    );
  }

  if (ext === 'py' || language === 'python') {
    return (
      <span
        className="inline-flex items-center justify-center rounded-[2px] font-bold leading-none shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: '#3776ab',
          color: '#ffd43b',
          fontSize: Math.max(8, Math.round(size * 0.56)),
        }}
      >
        Py
      </span>
    );
  }

  return <FileText size={size} className="shrink-0 opacity-75" />;
};
