#!/usr/bin/env bash
# StandupAI local stack bootstrap (Arch Linux)
# Run once: bash scripts/setup-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${1:-}" == "--skip-docker" ]]; then
  bash "$ROOT/scripts/start-supabase.sh"
  exit 0
fi

echo "==> Installing Docker (requires sudo password)..."
sudo pacman -Sy --needed --noconfirm docker docker-compose

echo "==> Enabling Docker service..."
sudo systemctl enable --now docker

echo "==> Adding $USER to docker group (log out/in or run: newgrp docker)..."
sudo usermod -aG docker "$USER"

if ! groups | grep -q docker; then
  echo ""
  echo "NOTE: docker group not active in this shell yet."
  echo "Run: newgrp docker"
  echo "Then: bash scripts/start-supabase.sh"
  exit 0
fi

bash "$ROOT/scripts/start-supabase.sh"
