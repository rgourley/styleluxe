/**
 * Test Anthropic API connection and list available models
 */

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function testAPI() {
  console.log('Testing Anthropic API...\n')
  console.log(`API Key present: ${!!process.env.ANTHROPIC_API_KEY}`)
  console.log(`API Key starts with: ${process.env.ANTHROPIC_API_KEY?.substring(0, 15)}...\n`)

  // Try a simple test with different model names
  const modelsToTry = [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ]

  for (const model of modelsToTry) {
    try {
      console.log(`Testing model: ${model}...`)
      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Hi',
        }],
      })
      console.log(`✅ SUCCESS with ${model}!`)
      console.log(`Response: ${response.content[0]}\n`)
      break // Found a working model
    } catch (error: any) {
      if (error.error?.type === 'not_found_error') {
        console.log(`❌ Model not found: ${model}\n`)
      } else {
        console.log(`❌ Error with ${model}: ${error.message}\n`)
      }
    }
  }
}

testAPI()
  .then(() => {
    console.log('\n✅ Test complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })






