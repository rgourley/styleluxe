import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-[#1a1a1a] mb-4 tracking-tight">Product Not Found</h1>
        <p className="text-xl text-[#4a4a4a] mb-8 font-light leading-relaxed">The product you're looking for doesn't exist or hasn't been published yet.</p>
        <Link 
          href="/"
          className="inline-block bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
        >
          Back to Trending
        </Link>
      </div>
    </div>
  )
}


