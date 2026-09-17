import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "simple-icons"],
    // Keep recently visited dashboard routes on the client so role
    // roadmap ↔ settings does not wait on a fresh server round-trip.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
}

export default nextConfig
