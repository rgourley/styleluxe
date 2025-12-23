'use client'

import ReactMarkdown from 'react-markdown'

/**
 * Process Amazon links in markdown to add affiliate tags
 * Client-safe version (uses hardcoded tag since process.env isn't available in client)
 */
function processAmazonLinks(text: string): string {
  // Use the affiliate tag (hardcoded fallback for client component)
  const associateTag = 'enduranceonli-20'
  
  // Match markdown links that point to Amazon
  return text.replace(
    /\[([^\]]+)\]\((https?:\/\/(?:www\.)?amazon\.(?:com|co\.uk|ca|de|fr|it|es|jp|in|au|br|mx|nl|pl|sg|ae|sa|tr|se|no|dk|fi)[^\s\)]+)\)/gi,
    (match, linkText, url) => {
      try {
        const urlObj = new URL(url)
        // Add or update the tag parameter
        urlObj.searchParams.set('tag', associateTag)
        return `[${linkText}](${urlObj.toString()})`
      } catch (error) {
        // If URL parsing fails, try to append the tag manually
        if (url.includes('?')) {
          return `[${linkText}](${url}&tag=${associateTag})`
        } else {
          return `[${linkText}](${url}?tag=${associateTag})`
        }
      }
    }
  )
}

/**
 * Convert bullet characters (•) and other formats to markdown list format
 */
function normalizeBullets(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inList = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Check if this line is a bullet point (•, -, *, or numbered)
    const isBullet = trimmed.match(/^[•\-\*]\s/) || trimmed.match(/^\d+\.\s/)
    
    if (isBullet) {
      // Convert • to - for markdown
      const normalized = trimmed.replace(/^[•]/, '-').replace(/^\*/, '-')
      
      // If we weren't in a list, start one
      if (!inList && result.length > 0 && result[result.length - 1].trim() !== '') {
        result.push('') // Add blank line before list
      }
      inList = true
      result.push(normalized)
    } else if (trimmed === '') {
      // Empty line - end list if we were in one
      if (inList) {
        result.push('')
        inList = false
      } else {
        result.push('')
      }
    } else {
      // Regular text line
      if (inList) {
        result.push('') // End list
        inList = false
      }
      result.push(line)
    }
  }
  
  return result.join('\n')
}

export default function MarkdownContent({ content }: { content: string }) {
  if (!content) return null
  
  // Process Amazon links to add affiliate tags
  let processedContent = processAmazonLinks(content)
  
  // Normalize bullet characters to markdown format
  processedContent = normalizeBullets(processedContent)
  
  return (
    <div className="markdown-content">
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
          ul: ({ node, ...props }) => <ul className="mb-4 ml-6 list-disc space-y-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="mb-4 ml-6 list-decimal space-y-2" {...props} />,
          li: ({ node, ...props }) => <li className="mb-2 leading-relaxed" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 mt-6" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mb-3 mt-5" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mb-2 mt-4" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600" {...props} />
          ),
          a: ({ node, href, ...props }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
              {...props}
            />
          ),
          strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}


