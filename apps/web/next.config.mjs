const remotePatterns = [
  {
    protocol: 'https',
    hostname: 'api.dicebear.com',
  },
  {
    protocol: 'https',
    hostname: 'firebasestorage.googleapis.com',
  },
  {
    protocol: 'https',
    hostname: 'lh3.googleusercontent.com',
  },
  {
    protocol: 'https',
    hostname: 'unitedlinkgroup.com',
  },
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
  },
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '3002',
    pathname: '/uploads/**',
  },
  {
    protocol: 'http',
    hostname: '127.0.0.1',
    port: '3002',
    pathname: '/uploads/**',
  },
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (apiUrl) {
  try {
    const parsedApiUrl = new URL(apiUrl);
    remotePatterns.push({
      protocol: parsedApiUrl.protocol.replace(':', ''),
      hostname: parsedApiUrl.hostname,
      port: parsedApiUrl.port,
      pathname: '/uploads/**',
    });
  } catch {
    // Ignore invalid env values and keep the known-safe defaults above.
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@unitedlinkgroup/types', '@unitedlinkgroup/database'],
  images: {
    remotePatterns,
  },
};

export default nextConfig;
