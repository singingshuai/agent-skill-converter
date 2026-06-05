@echo off
chcp 65001 >nul 2>&1
echo ========================================
echo   部署到 GitHub Pages
echo ========================================
echo.

if "%~1"=="" (
    echo 用法: deploy-github-pages.bat https://github.com/用户名/仓库名.git
    echo.
    echo 请先在 GitHub 上创建一个公开仓库，然后运行:
    echo   deploy-github-pages.bat https://github.com/你的用户名/仓库名.git
    pause
    exit /b 1
)

echo 正在构建前端...
cd /d "%~dp0frontend"
call npm install
call npm run build
cd /d "%~dp0"

echo 正在推送到 GitHub Pages...
git subtree split --prefix frontend/dist -b gh-pages
git push -f "%~1" gh-pages

echo.
echo ========================================
echo   部署完成！
echo ========================================
echo 请到 GitHub 仓库 → Settings → Pages → Source 选 gh-pages 分支
echo 稍等 1-2 分钟后访问: https://你的用户名.github.io/仓库名/
echo.
pause