/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type checking on production builds (Vercel)
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Prevent OpenCV.js from being bundled
    config.externals = config.externals || [];
    config.externals.push({
      'opencv.js': 'cv'
    });
    
    // Optimize for OpenCV.js loading
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          opencv: {
            test: /[\\/]node_modules[\\/].*opencv.*/,
            name: 'opencv',
            chunks: 'all',
            priority: 20,
          },
        },
      },
    };
    
    return config;
  },
}

module.exports = nextConfig
