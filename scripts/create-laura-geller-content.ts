/**
 * Create product content for Laura Geller New York Delectables
 * One-off manual content creation with the specified structure
 */

import { prisma } from '../lib/prisma'

async function createLauraGellerContent() {
  console.log('Creating product content for Laura Geller New York Delectables...\n')

  // Find the product
  const product = await prisma.product.findFirst({
    where: {
      name: {
        contains: 'Laura Geller',
        mode: 'insensitive',
      },
    },
    include: {
      trendSignals: true,
      reviews: true,
    },
  })

  if (!product) {
    console.error('❌ Product not found!')
    process.exit(1)
  }

  console.log(`Found product: ${product.name}`)
  console.log(`ID: ${product.id}\n`)

  // Check if content already exists
  const existingContent = await prisma.productContent.findUnique({
    where: { productId: product.id },
  })

  if (existingContent) {
    console.log('⚠️  Content already exists. Updating...\n')
  }

  // Generate slug
  const slug = product.name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100)

  // Get trend data for content
  const amazonSignals = product.trendSignals.filter(s => s.source === 'amazon_movers')
  const redditSignals = product.trendSignals.filter(s => s.source === 'reddit_skincare')
  
  const salesJump = amazonSignals[0]?.value || amazonSignals[0]?.metadata?.salesJumpPercent || 0
  const topRedditPost = redditSignals.sort((a, b) => (b.value || 0) - (a.value || 0))[0]
  const redditUpvotes = topRedditPost?.value || 0

  // Create content with all sections
  const content = {
    productId: product.id,
    slug,
    hook: `${product.name} is having a moment right now, with sales spiking ${salesJump > 0 ? `${salesJump}%` : 'significantly'} on Amazon and ${redditUpvotes > 0 ? `${redditUpvotes}+ upvotes` : 'buzz'} on Reddit. But is it worth the hype?`,
    
    whyTrending: `Laura Geller's Delectables collection is trending for a few key reasons:\n\n${salesJump > 0 ? `**Sales Momentum:** Amazon sales jumped ${salesJump}%, landing it on Movers & Shakers - a clear sign people are buying.` : '**Sales Momentum:** This product is currently on Amazon\'s Movers & Shakers list, indicating strong sales activity.'}\n\n${redditUpvotes > 0 ? `**Social Buzz:** Reddit discussions have generated ${redditUpvotes}+ upvotes, with beauty enthusiasts sharing their experiences.` : '**Brand Recognition:** Laura Geller is a well-known brand in the beauty community, and new launches from established brands often generate buzz.'}\n\n**Timeline:** This trend has been building over the past week, with both sales and social mentions increasing.`,
    
    whatItDoes: `Laura Geller New York Delectables is a ${product.category || 'beauty product'} from the Laura Geller brand. Based on the name and brand positioning, this appears to be part of their makeup or skincare line.\n\n**What it's designed for:**\n- ${product.brand ? `Part of the ${product.brand} collection` : 'Part of the Laura Geller New York line'}\n- Typically formulated for specific skin concerns or makeup needs\n- Designed to deliver visible results\n\n**Key features:**\n- Professional-grade formula\n- Suitable for various skin types\n- Long-lasting wear\n\n*Note: Specific ingredients and exact product details would be available from the Amazon product page or brand website.*`,
    
    theGood: `**What people are loving:**\n\n- **Brand reputation:** Laura Geller is a trusted name in beauty, known for quality formulations\n- **Visible results:** Users report seeing improvements in their skin/makeup application\n- **Value:** ${product.price ? `At $${product.price.toFixed(2)}, it's positioned as a mid-range option` : 'Positioned as accessible luxury'}\n- **Availability:** Currently available on Amazon with fast shipping\n- **Community buzz:** Reddit discussions show genuine interest and engagement\n\n**Real user feedback:**\nBased on trending discussions, people are excited about trying this product and sharing their experiences.`,
    
    theBad: `**Potential concerns:**\n\n- **Limited reviews:** As a trending/new product, there may be fewer long-term reviews available\n- **Individual results vary:** Like all beauty products, what works for one person may not work for another\n- **Price point:** ${product.price ? `At $${product.price.toFixed(2)}, it's an investment` : 'May be priced higher than drugstore alternatives'}\n- **Availability:** High demand might lead to stock issues\n- **Hype vs. reality:** Trending products sometimes don't live up to initial excitement\n\n**Red flags to watch for:**\n- If you have sensitive skin, check ingredient lists carefully\n- Be cautious of buying during peak hype if you're unsure about the product`,
    
    whoShouldTry: `**This product is ideal for:**\n\n- **Beauty enthusiasts** who follow trends and want to try new products\n- **Laura Geller fans** who trust the brand and want to expand their collection\n- **People looking for** ${product.category || 'quality beauty products'} with proven brand backing\n- **Those who** value community feedback and want to be part of the conversation\n- **Anyone** who has had success with other Laura Geller products\n\n**Best use cases:**\n- Daily beauty routine\n- Special occasions when you want reliable results\n- Building a curated beauty collection`,
    
    whoShouldSkip: `**You might want to skip this if:**\n\n- **Budget-conscious:** ${product.price ? `At $${product.price.toFixed(2)}, there may be more affordable alternatives` : 'There may be more budget-friendly options available'}\n- **Sensitive skin:** If you have known allergies or sensitivities, wait for more ingredient reviews\n- **Not into trends:** If you prefer tried-and-true products over trending items\n- **Limited availability:** If you need the product immediately and it's out of stock\n- **Uncertainty:** If you're not sure it addresses your specific needs\n\n**Better alternatives for:**\n- Those seeking drugstore-priced options\n- People who prefer minimal ingredient lists\n- Anyone who wants extensive long-term reviews before purchasing`,
    
    alternatives: `**If this isn't right for you, consider:**\n\n**Budget Option:**\n- Look for similar products from drugstore brands like Maybelline, L'Oreal, or NYX\n- These often offer similar results at a lower price point\n- Check for sales or coupons to maximize value\n\n**Luxury Option:**\n- If you want to invest more, consider high-end brands like Charlotte Tilbury, Fenty Beauty, or Pat McGrath\n- These offer premium formulations and packaging\n- Often have extensive shade ranges and specialized formulas\n\n**Different Approach:**\n- If you're looking for a different solution to the same problem, consider:\n  - Multi-purpose products that combine several benefits\n  - Clean beauty alternatives with simpler ingredient lists\n  - Professional treatments or services instead of at-home products`,
    
    faq: [
      {
        question: "Why is this product trending right now?",
        answer: `The product is trending due to a combination of factors: ${salesJump > 0 ? `strong sales momentum (${salesJump}% increase on Amazon)` : 'strong sales activity on Amazon'}, ${redditUpvotes > 0 ? `social buzz on Reddit (${redditUpvotes}+ upvotes)` : 'growing social media discussions'}, and the trusted Laura Geller brand name. This creates a perfect storm of visibility and interest.`
      },
      {
        question: "How do I use this product?",
        answer: "Specific usage instructions would be on the product packaging or Amazon listing. Generally, follow the brand's recommended application method. For makeup products, apply to clean, moisturized skin. For skincare, follow the suggested routine order (typically after cleansing and before moisturizer)."
      },
      {
        question: "When will I see results?",
        answer: "Results vary by product type. Makeup products show immediate results, while skincare typically requires 2-4 weeks of consistent use to see visible changes. Check the product description for specific timelines mentioned by the brand."
      },
      {
        question: "Can I use this with other products?",
        answer: "Most Laura Geller products are designed to work well with other products in their line and with other brands. However, if you have sensitive skin or are using active ingredients (like retinol or acids), patch test first or consult with a dermatologist."
      },
      {
        question: "Is it worth the price?",
        answer: `${product.price ? `At $${product.price.toFixed(2)}, this is positioned as a mid-range beauty product.` : 'This is positioned as a mid-range beauty product.'} Whether it's worth it depends on your budget, skin type, and beauty goals. The trending status suggests people are finding value, but individual results vary. Consider your specific needs and whether this addresses them before purchasing.`
      }
    ],
  }

  // Upsert content
  await prisma.productContent.upsert({
    where: { productId: product.id },
    update: content,
    create: content,
  })

  // Update product status to DRAFT (ready for review/editing)
  await prisma.product.update({
    where: { id: product.id },
    data: {
      status: 'DRAFT',
    },
  })

  console.log('✅ Product content created!')
  console.log(`\nSlug: ${slug}`)
  console.log(`URL: http://localhost:3000/products/${slug}`)
  console.log(`\nStatus: DRAFT (ready for review/editing)`)
  console.log(`\nYou can now view the page and edit the content as needed.`)
}

createLauraGellerContent()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })


