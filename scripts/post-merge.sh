#!/bin/bash
# Lancé automatiquement par Replit après une fusion. Hors Replit, utilisez
# directement : pnpm install && pnpm run db:migrate
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run migrate
