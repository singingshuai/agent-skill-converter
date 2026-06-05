@echo off
chcp 65001 >nul 2>&1
echo ========================================
echo   Agent Skill 转换器
echo ========================================
echo.
echo 正在启动本地服务...
echo 启动后浏览器会自动打开
echo 关闭此窗口即可停止服务
echo.

cd /d "%~dp0frontend\dist"

REM Try Python first, then Node
where python >nul 2>&1
if %errorlevel%==0 (
    echo 使用 Python 启动服务 (端口 8080)...
    start "" http://localhost:8080
    python -m http.server 8080
    goto :end
)

where node >nul 2>&1
if %errorlevel%==0 (
    echo 使用 Node 启动服务 (端口 8080)...
    start "" http://localhost:8080
    npx serve -s . -l 8080 --no-clipboard
    goto :end
)

echo 未找到 Python 或 Node，请安装其中一个。
pause

:end