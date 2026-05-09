/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      diagnostics: { 
        warnOnly: true,
        ignoreCodes: [151002]
      }
    }]
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^express$': '<rootDir>/../node_modules/express/index.js'
  },
  transformIgnorePatterns: [
    '<rootDir>/../node_modules/(?!express)'
  ]
};
