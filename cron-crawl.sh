#!/bin/bash
# ===================================================
#   HUBACTIVE CRON JOBS (LINUX)
# ===================================================
# Usage in crontab:
# 0 */2 * * * /bin/bash /path/to/hubphim/cron-crawl.sh >> /path/to/hubphim/cron.log 2>&1

# CHANGE THIS to your actual domain name in production (e.g. https://hubphim.com)
DOMAIN="http://localhost:3000"

echo "==================================================="
echo "  Starting Cron Tasks at $(date)"
echo "==================================================="

echo "[1/4] Crawling KKPhim..."
curl -s "${DOMAIN}/api/crawl?source=kkphim&page=1&skip_existing=1"
echo ""

echo "[2/4] Crawling OPhim..."
curl -s "${DOMAIN}/api/crawl?source=ophim&page=1&skip_existing=1"
echo ""

echo "[3/4] Crawling NguonC..."
curl -s "${DOMAIN}/api/crawl?source=nguonc&page=1&skip_existing=1"
echo ""

echo "[4/4] Cleaning inactive Watch Party Rooms..."
curl -s "${DOMAIN}/api/watch-room/cleanup"
echo ""

echo "==================================================="
echo "  All tasks completed at $(date)"
echo "==================================================="
