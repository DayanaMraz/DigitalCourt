/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Fallback for Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        module: false,
      };
    }
    
    // Ignore fhevmjs WASM imports during build
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        'tfhe_bg.wasm': 'tfhe_bg.wasm'
      });
    }

    return config;
  },
  // Disable static optimization to handle dynamic imports properly
  experimental: {
    esmExternals: 'loose'
  }
};

module.exports = nextConfig;