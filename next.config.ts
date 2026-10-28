import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./lib/agent/prompts/*.md'],
  },
};

export default nextConfig;
