import { PHASE_PRODUCTION_BUILD } from "next/constants.js";

/**

    @param {string} phase The current build phase.

    @returns {import('next').NextConfig}
    */
const config = (phase) => {
    const isProd = phase === PHASE_PRODUCTION_BUILD;

    return {
        // The 'output' option is configured ONLY for production builds.
        // In development (when running next dev), it is omitted, allowing
        // the development server to function correctly. This resolves the
        // "app-build-manifest.json" error.
        output: isProd ? "standalone" : undefined,
        reactStrictMode: true,
    };
};

export default config;
