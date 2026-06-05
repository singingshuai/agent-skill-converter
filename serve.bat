@echo off
chcp 65001 >nul 2>&1
echo 正在安装 serve 并启动...
npx serve -s frontend/dist -l 8080 --no-clipboard