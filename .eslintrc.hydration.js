// ESLint rules to catch common hydration issues
// Add to your main .eslintrc.json or use as a separate config

module.exports = {
  rules: {
    // Prevent Date.now() and Math.random() in JSX
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="Date"][callee.property.name="now"]',
        message: 'Date.now() causes hydration errors. Use a fixed date or format on server.',
      },
      {
        selector: 'CallExpression[callee.object.name="Math"][callee.property.name="random"]',
        message: 'Math.random() causes hydration errors. Use deterministic values.',
      },
    ],
    // Warn about typeof window checks
    'no-restricted-globals': [
      'warn',
      {
        name: 'window',
        message: 'typeof window checks can cause hydration errors. Use useEffect for client-only code.',
      },
    ],
  },
};




