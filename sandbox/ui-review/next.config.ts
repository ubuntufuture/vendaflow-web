import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  poweredByHeader: false,
  images: { unoptimized: true },
};
const withAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true', openAnalyzer: false });
export default withAnalyzer(config);
