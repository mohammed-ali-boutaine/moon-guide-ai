import { useState } from 'react';
import type { ChatMessage } from '@/types';
import SimpleMarkdown from './SimpleMarkdown';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.role === 'user';
  const hasSources = message.sources && message.sources.length > 0;

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%]">
          <div className="bg-primary-600 rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-xs text-gray-600 mt-1 text-right">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 mb-4">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-primary-900/40 border border-primary-700/50 flex items-center justify-center flex-shrink-0 mt-1">
        <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>

      <div className="max-w-[75%] flex-1">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="text-sm">
            <SimpleMarkdown content={message.content} />
          </div>
        </div>

        {/* Sources */}
        {hasSources && (
          <div className="mt-2">
            <button
              onClick={() => setSourcesOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
              <svg
                className={`w-3 h-3 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {sourcesOpen && (
              <div className="mt-1.5 space-y-1">
                {message.sources.map((src, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-gray-300 truncate">
                      {src.document_filename ?? `Document ${src.document_id}`}
                    </span>
                    {src.chunk_index !== undefined && (
                      <span className="text-gray-600 ml-auto flex-shrink-0">§{src.chunk_index + 1}</span>
                    )}
                    <span className="text-gray-600 flex-shrink-0">{(src.score * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 mt-1">{time}</p>
      </div>
    </div>
  );
}
