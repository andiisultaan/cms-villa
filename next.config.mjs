/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  api: {
    bodyParser: false, // Disable the default body parser for API routes
  },
};

export default nextConfig;
