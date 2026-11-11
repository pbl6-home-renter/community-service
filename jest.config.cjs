/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test/unit'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: '<rootDir>/test/tsconfig.json' },
    ],
  },
  moduleNameMapper: {
    '^@nestjs/common$': '<rootDir>/test/support/nest-common.ts',
    '^@nestjs/cqrs$': '<rootDir>/test/support/cqrs-decorators.ts',
    '^(shared|modules|config|database)/(.*)$': '<rootDir>/src/$1/$2',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  collectCoverageFrom: [
    'src/shared/domain/**/*.ts',
    'src/modules/**/domain/**/*.ts',
    'src/modules/**/application/**/*.ts',
    '!**/*.props.ts',
    '!**/*.command.ts',
    '!**/*.query.ts',
    '!**/*.result.ts',
    '!**/*.port.ts',
    '!**/*.interface.ts',
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
};
