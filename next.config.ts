import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/messages/send-audio": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

export default nextConfig;
