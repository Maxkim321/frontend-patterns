@echo off
rem 双击启动方案库文档站：后台起 dev server，等 4 秒后用默认浏览器打开
cd /d "%~dp0"
start "frontend-patterns docs" cmd /c "pnpm dev"
timeout /t 4 /nobreak >nul
start "" http://localhost:5173/patterns/big-data-table.html
