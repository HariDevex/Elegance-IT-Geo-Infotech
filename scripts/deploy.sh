#!/bin/bash

# Elegance EMS Deployment Helper
# Usage: ./scripts/deploy.sh [vercel|render|supabase|all]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_step() {
  echo -e "${GREEN}==> $1${NC}"
}

warn_step() {
  echo -e "${YELLOW}==> $1${NC}"
}

info_step() {
  echo -e "${BLUE}==> $1${NC}"
}

case "$1" in
  supabase)
    echo_step "Setting up Supabase..."
    echo ""
    echo "1. Create project at https://supabase.com"
    echo "2. Go to Settings → Database"
    echo "3. Copy Connection String (Node.js)"
    echo "4. IMPORTANT: Add ?sslmode=require at the end"
    echo ""
    echo "Your DATABASE_URL should look like:"
    echo "  postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require"
    echo ""
    warn_step "Without ?sslmode=require, production will fail!"
    ;;

  render)
    echo_step "Deploying Backend to Render..."
    echo ""
    info_step "Option 1: Blueprint (One-click)"
    echo "  1. Go to https://dashboard.render.com/blueprints"
    echo "  2. Connect GitHub repo"
    echo "  3. Select render.yaml"
    echo "  4. Add env vars:"
    echo "     - DATABASE_URL=postgresql://...?...sslmode=require"
    echo "     - JWT_SECRET=generate-secure-32-char-min"
    echo "     - FRONTEND_URL=https://your-vercel-app.vercel.app (update later)"
    echo "  5. Deploy"
    echo ""
    info_step "Option 2: Manual"
    echo "  1. New Web Service"
    echo "  2. Root Directory: server"
    echo "  3. Build: npm install"
    echo "  4. Start: node index.js"
    echo "  5. Add same env vars"
    echo ""
    echo_step "After deploy, copy your backend URL:"
    echo "  https://your-api.onrender.com"
    ;;

  vercel)
    echo_step "Deploying Frontend to Vercel..."
    echo ""
    info_step "IMPORTANT: Deploy Render FIRST, then get backend URL"
    echo ""
    echo "1. Go to https://vercel.com"
    echo "2. Import GitHub repo"
    echo "3. Add Environment Variables:"
    echo "     VITE_API_BASE_URL=https://your-backend.onrender.com"
    echo "4. Deploy"
    echo ""
    warn_step "Replace your-backend.onrender.com with your actual Render URL!"
    ;;

  all)
    echo_step "FULL DEPLOYMENT FLOW"
    echo ""
    echo "========================================"
    echo_step "Step 1: SUPABASE (Database)"
    echo "========================================"
    echo "1. Create project at https://supabase.com"
    echo "2. Settings → Database → Connection String"
    echo "3. IMPORTANT: Add ?sslmode=require"
    echo "   DATABASE_URL=postgresql://...?...sslmode=require"
    echo ""
    echo "========================================"
    echo_step "Step 2: RENDER (Backend API)"
    echo "========================================"
    echo "1. Go to https://dashboard.render.com/blueprints"
    echo "2. Connect GitHub, deploy render.yaml"
    echo "3. Add env vars:"
    echo "   - DATABASE_URL=postgresql://...?...sslmode=require"
    echo "   - JWT_SECRET=super-secure-32-char-min"
    echo "   - FRONTEND_URL=https://your-vercel.vercel.app (placeholder)"
    echo "4. Deploy → Get your backend URL:"
    echo "   https://your-api.onrender.com"
    echo ""
    echo "========================================"
    echo_step "Step 3: VERCEL (Frontend)"
    echo "========================================"
    echo "1. Go to https://vercel.com"
    echo "2. Import repo"
    echo "3. Add Environment Variable:"
    echo "   VITE_API_BASE_URL=https://your-api.onrender.com"
    echo "4. Deploy → Get your frontend URL"
    echo ""
    echo "========================================"
    echo_step "Step 4: UPDATE RENDER"
    echo "========================================"
    echo "1. Go to Render Dashboard → Your API service"
    echo "2. Environment Variables"
    echo "3. Update FRONTEND_URL to your Vercel URL:"
    echo "   FRONTEND_URL=https://your-app.vercel.app"
    echo ""
    echo_step "DONE!"
    ;;

  *)
    echo "Usage: $0 [supabase|render|vercel|all]"
    echo ""
    echo "Deploy targets:"
    echo "  supabase - Supabase setup steps"
    echo "  render  - Render backend deployment"
    echo "  vercel  - Vercel frontend deployment"
    echo "  all     - Full deployment flow (recommended)"
    exit 1
    ;;
esac