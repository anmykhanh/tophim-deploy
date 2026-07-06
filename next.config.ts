import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  images: {
    unoptimized: true, // Tiết kiệm CPU xử lý ảnh cho VPS vì đã dùng proxy ảnh ngoài
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
