import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow frontend ngrok host to access Next.js dev resources like /_next/webpack-hmr
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "a713-136-228-158-126.ngrok-free.app",
  ],

  // Optional: if you use external images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a713-136-228-158-126.ngrok-free.app",
      },
      {
        protocol: "https",
        hostname: "95cd-136-228-158-126.ngrok-free.app",
      },
    ],
  },

  // Optional: security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;