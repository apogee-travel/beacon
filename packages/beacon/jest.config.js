// jest.config.js
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testEnvironmentOptions: {},
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    moduleNameMapper: {
        // Handle module aliases (if you're using them in your Vite config)
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    // Tells Jest to ignore specific folders
    transformIgnorePatterns: ["/node_modules/(?!(@vite|vite)/)"],
};
