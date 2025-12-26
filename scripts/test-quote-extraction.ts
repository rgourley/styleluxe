/**
 * Test the updated quote extraction logic
 */

const whatRealUsersSay = `'This absorbs so much better than other collagen creams I've tried, and I wake up with softer skin' - verified buyer who compared it to three other K-beauty options.

'My skin looks plumper after using this for two weeks, but I don't think it's doing anything my regular moisturizer couldn't do' - honest review from someone with combination skin.`

console.log('Testing quote extraction...\n')
console.log('Content:', whatRealUsersSay.substring(0, 100) + '...\n')

// Test single quotes
const singleQuoteMatch = whatRealUsersSay.match(/'([^']{20,150})'/)
console.log('Single quote match:', singleQuoteMatch ? `"${singleQuoteMatch[1]}"` : 'None')

// Test before dash
const beforeDash = whatRealUsersSay.split(' - ')[0]
console.log('\nBefore dash:', beforeDash)
console.log('Length:', beforeDash.length)
console.log('Cleaned:', beforeDash.replace(/^['"]/, '').replace(/['"]$/, '').trim())

