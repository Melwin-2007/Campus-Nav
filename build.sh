#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "=========================================="
echo "      CAMPUS NAVIGATOR RENDER BUILD       "
echo "=========================================="

# 1. Install Backend Python Dependencies
echo "==> [1/3] Installing Python dependencies..."
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt

# 2. Build Frontend React SPA
echo "==> [2/3] Installing frontend dependencies & building Vite SPA..."
cd ../frontend
npm install
npm run build

# 3. Seed Database & Verify Assets
echo "==> [3/3] Preparing application database..."
cd ../backend
python -m app.seed.seeder

echo "==> Build finished successfully!"

