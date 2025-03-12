module.exports = {
    ignorePatterns: ["dist/*", ".eslintrc.js"],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: "./tsconfig.json",
    },
    extends: ["@apogeelabs/eslint-config"],
    // update rules so that .ts files have a max of 300 lines and a max of 85 lines per function
    // and test.ts files have a max of 1000 lines and no max line of function size
    rules: {
        "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
        "max-lines-per-function": ["error", { max: 85, skipBlankLines: true, skipComments: true }],
        "max-lines": ["error", { max: 1000, skipBlankLines: true, skipComments: true }],
        "max-lines-per-function": "off",
    },
};
