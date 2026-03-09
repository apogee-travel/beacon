module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testEnvironmentOptions: {
        // Allow Jest to resolve MSW's package.json exports field properly
        customExportConditions: ["node", "require", "default"],
    },
    transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
    },
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    transformIgnorePatterns: [
        "node_modules/(?!(@vite|vite|until-async)/)",
    ],
    // Run tests in src/lib (middleware), src/mocks (handlers), and src/stores (store logic)
    testMatch: ["**/src/lib/**/*.test.ts", "**/src/mocks/**/*.test.ts", "**/src/stores/**/*.test.ts"],
};
