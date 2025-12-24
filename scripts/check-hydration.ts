#!/usr/bin/env tsx
/**
 * Pre-commit hook to check for common hydration error patterns
 * Run this before committing: npx tsx scripts/check-hydration.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const HYDRATION_PATTERNS = [
  {
    pattern: /Date\.now\(\)/g,
    message: 'Date.now() causes hydration errors - use fixed dates or format on server',
    severity: 'error',
  },
  {
    pattern: /Math\.random\(\)/g,
    message: 'Math.random() causes hydration errors - use deterministic values',
    severity: 'error',
  },
  {
    pattern: /typeof\s+window\s*!==\s*['"]undefined['"]/g,
    message: 'typeof window checks in render cause hydration errors - use useEffect for client-only code',
    severity: 'warning',
  },
  {
    pattern: /new\s+Date\(\)/g,
    message: 'new Date() without arguments can cause hydration errors - use fixed dates or format on server',
    severity: 'warning',
  },
  {
    pattern: /toLocaleDateString\(\)|toLocaleTimeString\(\)|toLocaleString\(\)/g,
    message: 'Locale-specific date formatting can cause hydration errors - use consistent formatting',
    severity: 'warning',
  },
]

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /\/api\//, // API routes are server-only, Date.now() and Math.random() are fine there
  /\.route\.ts$/, // API route files
]

function shouldIgnoreFile(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath))
}

function checkFile(filePath: string): Array<{ line: number; message: string; severity: string }> {
  const issues: Array<{ line: number; message: string; severity: string }> = []
  
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      HYDRATION_PATTERNS.forEach(({ pattern, message, severity }) => {
        if (pattern.test(line)) {
          // Skip if it's in a comment
          if (!line.trim().startsWith('//') && !line.includes('/*')) {
            issues.push({
              line: index + 1,
              message: `${message} (${filePath}:${index + 1})`,
              severity,
            })
          }
        }
      })
    })
  } catch (error) {
    // Skip files that can't be read
  }
  
  return issues
}

function findFiles(dir: string, extensions: string[] = ['.tsx', '.ts', '.jsx', '.js']): string[] {
  const files: string[] = []
  
  try {
    const entries = readdirSync(dir)
    
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      
      if (shouldIgnoreFile(fullPath)) {
        continue
      }
      
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        files.push(...findFiles(fullPath, extensions))
      } else if (extensions.some(ext => entry.endsWith(ext))) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
  
  return files
}

function main() {
  console.log('🔍 Checking for hydration error patterns...\n')
  
  const appDir = join(process.cwd(), 'app')
  const componentsDir = join(process.cwd(), 'components')
  
  const files = [
    ...findFiles(appDir),
    ...findFiles(componentsDir),
  ]
  
  const allIssues: Array<{ file: string; issues: Array<{ line: number; message: string; severity: string }> }> = []
  
  files.forEach(file => {
    const issues = checkFile(file)
    if (issues.length > 0) {
      allIssues.push({ file, issues })
    }
  })
  
  if (allIssues.length === 0) {
    console.log('✅ No hydration error patterns found!\n')
    process.exit(0)
  }
  
  console.log('⚠️  Found potential hydration issues:\n')
  
  let errorCount = 0
  let warningCount = 0
  
  allIssues.forEach(({ file, issues }) => {
    console.log(`📄 ${file}`)
    issues.forEach(({ line, message, severity }) => {
      const icon = severity === 'error' ? '❌' : '⚠️ '
      console.log(`  ${icon} Line ${line}: ${message}`)
      if (severity === 'error') {
        errorCount++
      } else {
        warningCount++
      }
    })
    console.log()
  })
  
  console.log(`\n📊 Summary: ${errorCount} errors, ${warningCount} warnings`)
  
  if (errorCount > 0) {
    console.log('\n❌ Please fix errors before committing.\n')
    process.exit(1)
  } else {
    console.log('\n⚠️  Please review warnings before committing.\n')
    process.exit(0)
  }
}

main()

