# Amazon PA-API Setup

## Credentials Added

Your Amazon PA-API credentials have been configured:

- **Access Key ID**: `AKPAVSBSPJ1767040044`
- **Secret Access Key**: `QhvBlFrTzJrITdj6EltCc4sTT/7QeUr19C9Txhlj`
- **Partner Tag (Store ID)**: `enduranceonli-20`

## Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
AMAZON_PAAPI_ACCESS_KEY=AKPAVSBSPJ1767040044
AMAZON_PAAPI_SECRET_KEY=QhvBlFrTzJrITdj6EltCc4sTT/7QeUr19C9Txhlj
AMAZON_PAAPI_PARTNER_TAG=enduranceonli-20
AMAZON_ASSOCIATE_TAG=enduranceonli-20
```

## How It Works

1. **PA-API First**: When `searchAmazonProduct()` is called, it tries PA-API first
2. **Scraping Fallback**: If PA-API fails or isn't configured, it falls back to HTML scraping
3. **Rate Limiting**: PA-API requests are automatically rate-limited to 1 request/second (Amazon's limit)

## Benefits

- ✅ **Faster**: Structured JSON responses vs HTML parsing
- ✅ **More Reliable**: Official API, less likely to break
- ✅ **Better Data**: Official product details, prices, images
- ✅ **Automatic Affiliate Links**: URLs automatically include your affiliate tag

## Requirements

- Must maintain 10 qualified sales per 30 days to keep PA-API access
- Rate limit: 1 request per second

## Testing

The integration is automatic - existing code using `searchAmazonProduct()` will now use PA-API if credentials are configured.

