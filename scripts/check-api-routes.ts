#!/usr/bin/env tsx
/**
 * Pre-build check: Validate all API routes for common build issues
 * Run this before building to catch issues early
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const API_ROUTES_DIR = join(process.cwd(), 'app/api')

interface RouteIssue {
  file: string
  line: number
  issue: string
  severity: 'error' | 'warning'
}

const ISSUES: RouteIssue[] = []

function checkFile(filePath: string) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    const fileName = filePath.split('/').pop() || ''
    const isRouteFile = fileName === 'route.ts' || fileName === 'route.tsx'
    
    if (!isRouteFile) return
    
    // Check for missing dynamic export
    const hasDynamicExport = content.includes('export const dynamic')
    if (!hasDynamicExport) {
      ISSUES.push({
        file: filePath,
        line: 1,
        issue: 'Missing `export const dynamic = \'force-dynamic\'` - API routes should be dynamic',
        severity: 'warning',
      })
    }
    
    // Check for top-level prisma imports in route files
    if (content.includes("import { prisma }") || content.includes("import prisma")) {
      ISSUES.push({
        file: filePath,
        line: content.split('\n').findIndex(l => l.includes('import') && l.includes('prisma')) + 1,
        issue: 'Top-level prisma import - consider using dynamic import to prevent build issues',
        severity: 'warning',
      })
    }
    
    // Check for script imports that might execute during build
    // Check both @/scripts/ and relative paths like ../../../../scripts/
    const scriptImports = content.match(/import.*from ['"](@\/scripts\/|\.\.\/.*scripts\/)/g)
    if (scriptImports) {
      scriptImports.forEach((match, index) => {
        const lineNum = content.split('\n').findIndex(l => l.includes(match)) + 1
        ISSUES.push({
          file: filePath,
          line: lineNum,
          issue: `Static import from scripts/ - use dynamic import to prevent build-time execution: ${match}`,
          severity: 'error',
        })
      })
    }
    
  } catch (error) {
    // Skip files that can't be read
  }
}

function findRouteFiles(dir: string): string[] {
  const files: string[] = []
  
  try {
    const entries = readdirSync(dir)
    
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      
      if (entry.includes('node_modules') || entry.includes('.next')) {
        continue
      }
      
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        files.push(...findRouteFiles(fullPath))
      } else if (entry === 'route.ts' || entry === 'route.tsx') {
        files.push(fullPath)
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
  
  return files
}

function main() {
  console.log('🔍 Checking API routes for build issues...\n')
  
  const routeFiles = findRouteFiles(API_ROUTES_DIR)
  
  routeFiles.forEach(checkFile)
  
  if (ISSUES.length === 0) {
    console.log('✅ No issues found!\n')
    process.exit(0)
  }
  
  console.log('⚠️  Found potential issues:\n')
  
  let errorCount = 0
  let warningCount = 0
  
  ISSUES.forEach(({ file, line, issue, severity }) => {
    const icon = severity === 'error' ? '❌' : '⚠️ '
    const relativePath = file.replace(process.cwd() + '/', '')
    console.log(`${icon} ${relativePath}:${line}`)
    console.log(`   ${issue}\n`)
    if (severity === 'error') {
      errorCount++
    } else {
      warningCount++
    }
  })
  
  console.log(`\n📊 Summary: ${errorCount} errors, ${warningCount} warnings`)
  
  if (errorCount > 0) {
    console.log('\n❌ Please fix errors before building.\n')
    process.exit(1)
  } else {
    console.log('\n⚠️  Please review warnings before building.\n')
    process.exit(0)
  }
}

main()

