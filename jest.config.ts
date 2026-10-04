import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Override tsconfig for tests — allow CommonJS module resolution
          module: 'commonjs',
          // Relax unused variable checks in test files
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
      },
    ],
  },
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app/**', // Next.js pages are not unit-testable in isolation
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Run tests serially to avoid DB connection pool exhaustion
  maxWorkers: process.env.CI ? 2 : 1,
  // Global test timeout
  testTimeout: 10000,
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  // Force Jest to exit after all tests complete (prevents hanging from open handles)
  forceExit: true,
};

export default config;
