/**
 * Test R2 upload functionality
 * This script tests if R2 credentials are working correctly
 */

// Load environment variables - must be done before any other imports
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { uploadImageToR2, downloadAndUploadToR2 } from '../lib/r2-storage'

async function testR2Upload() {
  console.log('🧪 Testing R2 upload functionality...\n')

  // Check environment variables
  console.log('📋 Environment Variables:')
  console.log(`  R2_BUCKET_NAME: ${process.env.R2_BUCKET_NAME || 'NOT SET'}`)
  console.log(`  R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? 'SET (hidden)' : 'NOT SET'}`)
  console.log(`  R2_SECRET_ACCESS_KEY: ${process.env.R2_SECRET_ACCESS_KEY ? 'SET (hidden)' : 'NOT SET'}`)
  console.log(`  R2_PUBLIC_URL: ${process.env.R2_PUBLIC_URL || 'NOT SET'}`)
  console.log(`  R2_ENDPOINT: ${process.env.R2_ENDPOINT || 'NOT SET'}\n`)

  if (!process.env.R2_BUCKET_NAME || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.error('❌ Missing required R2 environment variables!')
    console.error('   Please set R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in your .env file')
    process.exit(1)
  }

  try {
    // Test 1: Upload a small test image (1x1 pixel PNG)
    console.log('Test 1: Uploading test image buffer...')
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    const testFileName = `test-${Date.now()}.png`
    const testUrl = await uploadImageToR2(testImageBuffer, testFileName, 'image/png')
    console.log(`✅ Test 1 passed! Uploaded to: ${testUrl}\n`)

    // Test 2: Download and upload a public image (not Amazon)
    console.log('Test 2: Downloading and uploading a public image...')
    const publicImageUrl = 'https://via.placeholder.com/150.png'
    const downloadedFileName = `test-downloaded-${Date.now()}.png`
    const downloadedUrl = await downloadAndUploadToR2(publicImageUrl, downloadedFileName)
    console.log(`✅ Test 2 passed! Uploaded to: ${downloadedUrl}\n`)

    console.log('✅ All tests passed! R2 is configured correctly.')
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    console.error('   Full error:', error)
    if (error.stack) {
      console.error('   Stack:', error.stack)
    }
    process.exit(1)
  }
}

testR2Upload()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

