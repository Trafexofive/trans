import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants.js';

/**
 * @param {string} phase The current Next.js phase
 * @returns {import('next').NextConfig}
 */
const nextConfig = (phase) => {
  // Base configuration applicable to all environments
  const config = {
    reactStrictMode: true,
  };

  // Apply development-specific settings
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    Object.assign(config, {
      devIndicators: {
        allowedDevOrigins: [
          "https://trans.clevo.ddnsgeek.com",
          "http://localhost:8080",
        ],
      },
    });
  }

  // Apply production-specific settings
  if (phase === PHASE_PRODUCTION_BUILD) {
    Object.assign(config, {
      output: 'standalone',
    });
  }

  return config;
};

export default nextConfig;
