import { useRef, useEffect, KeyboardEvent } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({ value, onChange, onSubmit, isLoading, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled && value.trim()) {
        onSubmit();
      }
    }
  }

  const canSend = !isLoading && !disabled && value.trim().length > 0;

  return (
    <div className="border-t border-gray-800 bg-gray-900/50 px-4 py-3">
      <div className="flex items-end gap-3 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus-within:border-primary-600 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
          rows={1}
          maxLength={2000}
          disabled={isLoading || disabled}
          className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 text-sm resize-none outline-none min-h-[24px] max-h-40 disabled:opacity-50"
        />
        <button
          onClick={onSubmit}
          disabled={!canSend}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Send"
        >
          {isLoading ? (
            <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-1.5 text-center">
        AI answers are based on course documents only.
      </p>
    </div>
  );
}
