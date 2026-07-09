import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok (and similar tunnels) to use Next.js dev resources
  // so client navigation + cart JS work when sharing over a tunnel.
  allowedDevOrigins: [
    "clunky-obstinate-dab.ngrok-free.dev",
    "*.ngrok-free.dev",
    "*.ngrok.io",
  ],
};

export default nextConfig;
