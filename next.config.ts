import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'pino-loki', 'thread-stream'],
};

export default nextConfig;
