#!/bin/bash
# Deploy to GitHub Pages
# Usage: First create a repo on GitHub, then run this script

set -e

REPO_URL="$1"
if [ -z "$REPO_URL" ]; then
  echo "Usage: ./deploy-github-pages.sh https://github.com/用户名/仓库名.git"
  exit 1
fi

# Build
cd frontend && npm install && npm run build && cd ..

# Create gh-pages branch with only dist content
git subtree split --prefix frontend/dist -b gh-pages
git push -f "$REPO_URL" gh-pages

echo ""
echo "部署完成！"
echo "请到 GitHub 仓库 → Settings → Pages → Source 选 gh-pages 分支"
echo "稍等 1-2 分钟后访问: https://用户名.github.io/仓库名/"