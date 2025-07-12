//
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//     reactStrictMode: true,
//     // Base configuration applicable to all environments.
// };
//
// // Check if the environment is development.
// if (process.env.NODE_ENV === "development") {
//     // Add development-specific configurations here.
//     nextConfig.devIndicators = {
//         allowedDevOrigins: [
//             "https://trans.clevo.ddnsgeek.com",
//         ],
//     };
// }
//
// // For production builds, ensure the output is 'standalone'.
// // This is handled by Next.js's default behavior with Vercel or can be set explicitly.
// // For the docker build, we can use a separate config or rely on the build phase.
// // To keep this file simple and robust, we handle the output based on a build-time env var.
// if (process.env.NEXT_OUTPUT_MODE === "standalone") {
//     nextConfig.output = "standalone";
// }
//
// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // UNCONDITIONAL CONFIGURATION FOR DEVELOPMENT
  // This config is used by `docker-compose.dev.yml` and will not affect production builds.
  devIndicators: {
    allowedDevOrigins: [
      "https://trans.clevo.ddnsgeek.com",
      "https://test.clevo.ddnsgeek.com",
    ],
  },
};

export default nextConfig;

