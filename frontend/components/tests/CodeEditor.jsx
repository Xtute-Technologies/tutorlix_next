'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center bg-[#1e1e1e] text-sm text-slate-300">
      Loading editor...
    </div>
  ),
});

const LANGUAGE_MAP = {
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  java: 'java',
  javascript: 'javascript',
  js: 'javascript',
  python: 'python',
  py: 'python',
  typescript: 'typescript',
  ts: 'typescript',
};

const EXTENSION_MAP = {
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  javascript: 'js',
  python: 'py',
  typescript: 'ts',
};

function normalizeLanguage(language) {
  return LANGUAGE_MAP[String(language || '').trim().toLowerCase()] || 'plaintext';
}

export default function CodeEditor({
  value,
  onChange,
  language = 'python',
  readOnly = false,
  height = 460,
  title = 'answer',
}) {
  const normalizedLanguage = normalizeLanguage(language);
  const extension = EXTENSION_MAP[normalizedLanguage] || 'txt';
  const fileName = `${title || 'answer'}.${extension}`;

  const options = useMemo(
    () => ({
      automaticLayout: true,
      fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
      fontLigatures: true,
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: true },
      overviewRulerBorder: false,
      padding: { top: 14, bottom: 14 },
      readOnly,
      renderLineHighlight: 'all',
      scrollBeyondLastLine: false,
      scrollbar: {
        horizontalScrollbarSize: 10,
        verticalScrollbarSize: 10,
      },
      tabSize: 2,
      wordWrap: 'on',
    }),
    [readOnly]
  );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#1e1e1e] shadow-sm">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 bg-[#252526] px-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-xs font-medium text-slate-300">{fileName}</span>
        </div>
        <Badge variant="secondary" className="border-slate-700 bg-slate-800 text-slate-200">
          {normalizedLanguage}
        </Badge>
      </div>
      <MonacoEditor
        height={`${height}px`}
        language={normalizedLanguage}
        onChange={(nextValue) => onChange?.(nextValue || '')}
        options={options}
        theme="vs-dark"
        value={value || ''}
      />
    </div>
  );
}
