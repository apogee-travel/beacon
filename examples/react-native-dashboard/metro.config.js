const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const workspaceRoot = path.resolve(__dirname, "../..");
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Watch the workspace root so metro can access pnpm's virtual store (.pnpm/)
// and the workspace package source directories. The duplicate-React problem
// from watching the whole workspace is handled by resolveRequest below.
config.watchFolders = [workspaceRoot];

// Module resolution: project node_modules first, then workspace root for
// shared deps (lodash, etc.) that pnpm hoists to the workspace level.
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
];

// Point workspace package imports at src/ so metro transpiles them directly.
// No `pnpm build` prerequisite, and react resolves from the RN app's node_modules.
config.resolver.extraNodeModules = {
    "@apogeelabs/beacon": path.resolve(workspaceRoot, "packages/beacon/src"),
    "@apogeelabs/beacon-react-utils": path.resolve(
        workspaceRoot,
        "packages/beacon-react-utils/src"
    ),
};

// Force singleton resolution for packages that MUST have exactly one copy.
// Without this, pnpm's strict node_modules gives workspace packages their own
// react/mobx — two React instances = "Invalid hook call" crash.
//
// We return { filePath, type } directly, bypassing metro's resolver entirely.
// This is the nuclear option, but pnpm + metro leaves no subtler choice.
const singletons = new Set(["react", "react-native", "mobx", "mobx-react-lite"]);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (singletons.has(moduleName)) {
        // require.resolve from projectRoot finds the RN app's installed copy
        return {
            filePath: require.resolve(moduleName, { paths: [projectRoot] }),
            type: "sourceFile",
        };
    }

    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
