/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
};

// --- DEVELOPMENT-ONLY SETTINGS ---
// These are applied only when you explicitly set the environment to 'development'.
if (process.env.NODE_ENV === "development") {
    console.log(
        "✅ Running in development mode, applying dev-specific Next.js config.",
    );
    nextConfig.devIndicators = {
        // This silences the cross-origin warning when hosting the dev server on a custom domain.
        allowedDevOrigins: [
            "https://trans.clevo.ddnsgeek.com",
            "http://localhost:8080",
        ],
    };
}

// --- PRODUCTION-ONLY SETTINGS ---
// The 'standalone' output is essential for creating an optimized Docker image for production.
if (process.env.NODE_ENV === "production") {
    console.log("📦 Running in production mode, setting output to standalone.");
    nextConfig.output = "standalone";
}

export default nextConfig;
