// Use the repository .env documented in README and shared with Prisma/Docker.
// Values supplied by the shell or Doppler always take precedence.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const nextCli = require.resolve('next/dist/bin/next');
process.argv = [process.execPath, nextCli, 'dev', path.resolve(__dirname, '../apps/web'), ...process.argv.slice(2)];
require(nextCli);
