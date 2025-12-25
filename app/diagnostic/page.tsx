import { getTrendingNowHomepage, getAboutToExplodeProducts, getRecentlyHotProducts } from '@/lib/trending-products'

export const dynamic = 'force-dynamic'

export default async function DiagnosticPage() {
  const [trendingNow, aboutToExplode, recentlyHot] = await Promise.all([
    getTrendingNowHomepage(8),
    getAboutToExplodeProducts(8),
    getRecentlyHotProducts(8),
  ])

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>🔍 Diagnostic Page</h1>
      
      <h2>Environment:</h2>
      <pre>
        DATABASE_URL: {process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}
        {'\n'}NODE_ENV: {process.env.NODE_ENV}
      </pre>

      <h2>Trending Now ({trendingNow.length} products):</h2>
      <ul>
        {trendingNow.map(p => (
          <li key={p.id}>
            {p.name} - Score: {p.currentScore || p.trendScore}, Days: {p.daysTrending || 'null'}
          </li>
        ))}
      </ul>

      <h2>About to Explode ({aboutToExplode.length} products):</h2>
      <ul>
        {aboutToExplode.map(p => (
          <li key={p.id}>
            {p.name} - Score: {p.currentScore || p.trendScore}, Days: {p.daysTrending || 'null'}
          </li>
        ))}
      </ul>

      <h2>Recently Hot ({recentlyHot.length} products):</h2>
      <ul>
        {recentlyHot.map(p => (
          <li key={p.id}>
            {p.name} - Score: {p.currentScore || p.trendScore}, Days: {p.daysTrending || 'null'}
          </li>
        ))}
      </ul>
    </div>
  )
}

