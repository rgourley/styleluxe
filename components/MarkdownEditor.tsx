'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  onRegenerate?: () => void
  isRegenerating?: boolean
}

export default function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder = 'Write markdown here...',
  onRegenerate,
  isRegenerating = false,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(true)

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {label && (
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700">{label}</label>
          <div className="flex items-center gap-2">
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Regenerate this section with AI"
              >
                {isRegenerating ? '🔄 Regenerating...' : '✨ Regenerate with AI'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
        </div>
      )}
      <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} divide-x divide-gray-300`}>
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-96 p-4 font-mono text-sm border-0 focus:ring-0 focus:outline-none resize-none"
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {value.length} characters
          </div>
        </div>
        {showPreview && (
          <div className="overflow-y-auto h-96 p-4 prose prose-sm max-w-none">
            <ReactMarkdown>{value || '*No content yet*'}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

