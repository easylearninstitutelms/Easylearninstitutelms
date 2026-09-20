import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // এটি দিলে বিল্ডে টাইপস্ক্রিপ্ট কোনো এরর দিয়ে বিল্ড আটকাবে না
    ignoreBuildErrors: true,
  },
  eslint: {
    // ইএসলিন্ট এরর ইগনোর করবে
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;