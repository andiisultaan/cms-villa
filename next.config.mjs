/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["res.cloudinary.com"],
    minimumCacheTTL: 0, // Menonaktifkan cache untuk gambar
  },
  // Nonaktifkan output caching
  output: "standalone",

  // Nonaktifkan compression untuk meningkatkan debugging
  compress: false,

  // Memaksa semua rute menjadi dinamis
  reactStrictMode: true,
};

// Tambahkan ini untuk memastikan tidak ada cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default nextConfig;
