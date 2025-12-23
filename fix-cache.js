const fs = require('fs');
const content = fs.readFileSync('lib/trending-products.ts', 'utf8');

// Fix all broken unstable_cache calls
let fixed = content
  // Remove broken unstable_cache wrapper patterns
  .replace(/\/\/ Temporarily disabled: return unstable_cache\(\s*async \(\) => \{/g, '')
  .replace(/    \},\s*\[.*?\],\s*\{[^}]*revalidate:[^}]*\}[^)]*\/\/ \)\)\(\)/g, '')
  // Fix indentation
  .replace(/^    async \(\) => \{/gm, '')
  .replace(/^      if \(!process\.env\.DATABASE_URL\)/gm, '  if (!process.env.DATABASE_URL)')
  .replace(/^      try \{/gm, '  try {')
  .replace(/^        const products = await Promise\.race\(\[/gm, '    const products = await Promise.race([')
  .replace(/^          prisma\.product\.findMany\(/gm, '      prisma.product.findMany(')
  .replace(/^            where:/gm, '        where:')
  .replace(/^              status:/gm, '          status:')
  .replace(/^                in:/gm, '            in:')
  .replace(/^              \/\/ Days trending/gm, '          // Days trending')
  .replace(/^              daysTrending:/gm, '          daysTrending:')
  .replace(/^                gte:/gm, '            gte:')
  .replace(/^                lte:/gm, '            lte:')
  .replace(/^              \/\/ Peak score/gm, '          // Peak score')
  .replace(/^              peakScore:/gm, '          peakScore:')
  .replace(/^              \/\/ Price/gm, '          // Price')
  .replace(/^              price:/gm, '          price:')
  .replace(/^            include:/gm, '        include:')
  .replace(/^              trendSignals:/gm, '          trendSignals:')
  .replace(/^                orderBy:/gm, '            orderBy:')
  .replace(/^                  detectedAt:/gm, '              detectedAt:')
  .replace(/^                take:/gm, '            take:')
  .replace(/^              reviews:/gm, '          reviews:')
  .replace(/^              content:/gm, '          content:')
  .replace(/^            orderBy:/gm, '        orderBy:')
  .replace(/^              peakScore:/gm, '          peakScore:')
  .replace(/^              createdAt:/gm, '          createdAt:')
  .replace(/^              currentScore:/gm, '          currentScore:')
  .replace(/^              lastUpdated:/gm, '          lastUpdated:')
  .replace(/^            take:/gm, '        take:')
  .replace(/^          \}\),/gm, '      }),')
  .replace(/^          new Promise/gm, '      new Promise')
  .replace(/^            setTimeout/gm, '        setTimeout')
  .replace(/^              console\.warn/gm, '          console.warn')
  .replace(/^              resolve\(\[\]\)/gm, '          resolve([])')
  .replace(/^            \)/gm, '        )')
  .replace(/^          \)/gm, '      )')
  .replace(/^        \]\)/gm, '    ])')
  .replace(/^        return products/gm, '    return products')
  .replace(/^      \} catch \(error\) \{/gm, '  } catch (error) {')
  .replace(/^        console\.error/gm, '    console.error')
  .replace(/^        return \[\]/gm, '    return []')
  .replace(/^      \}/gm, '  }');

fs.writeFileSync('lib/trending-products.ts', fixed);
console.log('Fixed!');

