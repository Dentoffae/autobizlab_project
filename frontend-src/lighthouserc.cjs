module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --port 4173 --strictPort --host 127.0.0.1',
      startServerReadyPattern: 'Local:',
      numberOfRuns: 1,
      url: [
        'http://127.0.0.1:4173/',
        'http://127.0.0.1:4173/en',
        'http://127.0.0.1:4173/ru',
        'http://127.0.0.1:4173/en/enquire',
        'http://127.0.0.1:4173/en/privacy',
      ],
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.45 }],
        'categories:accessibility': ['warn', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        // hero + шрифты: мягкий порог, чтобы не флапать на CI
        'largest-contentful-paint': ['warn', { maxNumericValue: 8000 }],
      },
    },
  },
}
