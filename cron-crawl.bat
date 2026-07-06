@echo off
echo ===================================================
echo   HUBACTIVE CRON JOBS (WINDOWS)
echo ===================================================
echo Time: %date% %time%

set DOMAIN=http://localhost:3000

echo [1/4] Crawling KKPhim...
curl -s "%DOMAIN%/api/crawl?source=kkphim&page=1&skip_existing=1"
echo.

echo [2/4] Crawling OPhim...
curl -s "%DOMAIN%/api/crawl?source=ophim&page=1&skip_existing=1"
echo.

echo [3/4] Crawling NguonC...
curl -s "%DOMAIN%/api/crawl?source=nguonc&page=1&skip_existing=1"
echo.

echo [4/4] Cleaning inactive Watch Party Rooms...
curl -s "%DOMAIN%/api/watch-room/cleanup"
echo.

echo ===================================================
echo   All tasks completed successfully.
echo ===================================================
