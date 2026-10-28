import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./lib/agent/prompts/*.md', './DECISIONS.md'],
  },
};

export default nextConfig;
