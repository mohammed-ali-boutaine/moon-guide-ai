import React from 'react';

/**
 * Minimal markdown renderer — no external deps.
 * Handles: code blocks, inline code, bold, italic, headings, lists, line breaks.
 */
export default function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-3 my-2 overflow-x-auto text-sm">
          {lang && <div className="text-xs text-gray-500 mb-1">{lang}</div>}
          <code className="text-green-300 font-mono">{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
      const sizes = { 1: 'text-lg font-bold mt-3 mb-1', 2: 'text-base font-bold mt-2 mb-1', 3: 'text-sm font-semibold mt-2 mb-1' };
      elements.push(<Tag key={i} className={`text-white ${sizes[level as 1|2|3]}`}>{inlineFormat(text)}</Tag>);
      i++;
      continue;
    }

    // Unordered list item
    if (/^[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-1 my-1 text-gray-300">
          {listItems.map((item, idx) => <li key={idx}>{inlineFormat(item)}</li>)}
        </ul>
      );
      continue;
    }

    // Ordered list item
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-1 my-1 text-gray-300">
          {listItems.map((item, idx) => <li key={idx}>{inlineFormat(item)}</li>)}
        </ol>
      );
      continue;
    }

    // Blank line → spacer
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-gray-200 leading-relaxed">
        {inlineFormat(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function inlineFormat(text: string): React.ReactNode[] {
  // Split by inline code, bold, italic patterns
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="bg-gray-900 border border-gray-700 text-green-300 font-mono text-xs px-1 py-0.5 rounded">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx} className="italic">{part.slice(1, -1)}</em>;
    }
    return <span key={idx}>{part}</span>;
  });
}
