// Postinstall script to fix Prisma client default.js for Next.js compatibility
const fs = require('fs');
const path = require('path');

const defaultJsPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'default.js');
const clientTsPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'client.ts');

if (fs.existsSync(clientTsPath) && !fs.existsSync(defaultJsPath)) {
  // For Prisma 6: Create default.js that re-exports from @prisma/client
  // This avoids circular dependencies and TypeScript require issues
  const content = `// Auto-generated for Prisma 6 + Next.js compatibility
// Re-export from @prisma/client which Next.js handles correctly
module.exports = require('@prisma/client');
`;
  fs.writeFileSync(defaultJsPath, content, 'utf8');
  console.log('✅ Created .prisma/client/default.js');
}







