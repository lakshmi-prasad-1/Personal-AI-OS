import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove development-specific config for production
  // allowedDevOrigins: ["10.29.207.240"],
  
  // Output configuration for Vercel
  output: 'standalone',
  
  // Environment variables that should be available in the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Image optimization
  images: {
    domains: [],
  },
  
  // Turbopack configuration
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
