# StyleLuxe

A website that automatically tracks trending beauty products and creates review pages for them. Think of it as a "what's hot right now" dashboard for beauty enthusiasts.

## Features

- **Trending Dashboard**: Homepage showing all trending products sorted by trend score
- **Product Reviews**: Detailed review pages with sections like "Why It's Trending", "The Good", "The Bad", etc.
- **Data-Driven**: Tracks products from Amazon Movers & Shakers and Reddit discussions
- **AI-Generated Content**: Uses Claude AI to generate balanced, honest reviews

## Tech Stack

- **Next.js 16** (App Router) - Web framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Prisma** - Database ORM
- **Neon Postgres** - Database (free tier)
- **Claude AI (Anthropic)** - Content generation

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Neon Postgres database (sign up at [neon.tech](https://neon.tech))
- An Anthropic API key (for content generation)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up your environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your:
- `DATABASE_URL` from Neon
- `ANTHROPIC_API_KEY` from Anthropic

3. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the site.

## Database Schema

The database includes:
- **Products**: Product information, trend scores, status
- **TrendSignals**: Data points that made a product trending (Amazon sales spikes, Reddit mentions, etc.)
- **Reviews**: Scraped reviews from Amazon and Reddit
- **ProductContent**: AI-generated review content

## Project Structure

```
app/
  page.tsx              # Homepage with trending dashboard
  products/[slug]/      # Individual product review pages
  admin/                # Admin area (to be built)
lib/
  prisma.ts            # Prisma client instance
  products.ts          # Product data functions
prisma/
  schema.prisma        # Database schema
```

## Next Steps

1. **Data Collection**: Build scripts to scrape Amazon Movers & Shakers and Reddit
2. **Admin Interface**: Create admin view to see flagged products and generate reviews
3. **Content Generation**: Integrate Claude API to generate review content
4. **Deployment**: Deploy to Vercel

## License

Private project
