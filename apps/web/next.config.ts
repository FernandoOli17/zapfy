import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Em monorepo, Next so carrega .env da pasta da app por padrao.
// Aqui forcamos load do .env da raiz (../../.env) ANTES do Next inicializar,
// pra todos os modulos (Better Auth, @zapai/db, etc.) verem as vars.
const here = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(here, '../../.env'), override: false });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@zapai/ui', '@zapai/shared', '@zapai/db'],
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'utfs.io' },
    ],
  },
};

export default nextConfig;
