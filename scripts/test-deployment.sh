#!/bin/bash
# test-deployment.sh
# Automated deployment testing script

set -e

SITE_URL="https://blog-cluwwwhci-lukaszangerl-gmxats-projects.vercel.app"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "════════════════════════════════════════════════════════"
echo "🧪 Testing Deployment - Neurohackingly Blog"
echo "════════════════════════════════════════════════════════"
echo ""

# 1. Build test
echo -e "${YELLOW}1️⃣ Testing local build...${NC}"
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Build successful${NC}"
  PAGE_COUNT=$(find dist -name "*.html" | wc -l)
  echo "   📄 Generated $PAGE_COUNT HTML pages"
else
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi
echo ""

# 2. Check deployment status
echo -e "${YELLOW}2️⃣ Checking Vercel deployment...${NC}"
DEPLOY_STATUS=$(vercel ls --json 2>/dev/null | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$DEPLOY_STATUS" = "READY" ]; then
  echo -e "${GREEN}✅ Deployment status: READY${NC}"
else
  echo -e "${YELLOW}⚠️  Deployment status: $DEPLOY_STATUS${NC}"
fi
echo ""

# 3. Test site accessibility
echo -e "${YELLOW}3️⃣ Testing site accessibility...${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$SITE_URL" 2>/dev/null)
if [ "$STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ Site is live and accessible (HTTP $STATUS)${NC}"
elif [ "$STATUS" -eq 401 ]; then
  echo -e "${YELLOW}⚠️  Site requires authentication (HTTP $STATUS)${NC}"
  echo "   This is normal for password-protected deployments"
else
  echo -e "${RED}❌ Site returned HTTP $STATUS${NC}"
fi
echo ""

# 4. Check key pages
echo -e "${YELLOW}4️⃣ Checking key pages...${NC}"
PAGES=("/" "/blog" "/newsletter" "/rss.xml")
for page in "${PAGES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$SITE_URL$page" 2>/dev/null)
  if [ "$STATUS" -eq 200 ]; then
    echo -e "   ${GREEN}✅${NC} $page (HTTP $STATUS)"
  elif [ "$STATUS" -eq 401 ]; then
    echo -e "   ${YELLOW}🔒${NC} $page (Protected)"
  else
    echo -e "   ${YELLOW}⚠️${NC} $page (HTTP $STATUS)"
  fi
done
echo ""

# 5. Check SSL certificate
echo -e "${YELLOW}5️⃣ Checking SSL certificate...${NC}"
if curl -s --head "$SITE_URL" | grep -q "HTTP/2 "; then
  echo -e "${GREEN}✅ HTTPS enabled (HTTP/2)${NC}"
else
  echo -e "${YELLOW}⚠️  HTTP/2 not detected${NC}"
fi
echo ""

# 6. Check response time
echo -e "${YELLOW}6️⃣ Testing response time...${NC}"
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$SITE_URL" 2>/dev/null)
echo "   ⏱️  Response time: ${RESPONSE_TIME}s"
if (( $(echo "$RESPONSE_TIME < 3.0" | bc -l) )); then
  echo -e "   ${GREEN}✅ Response time is good (<3s)${NC}"
else
  echo -e "   ${YELLOW}⚠️  Response time is high (>3s)${NC}"
fi
echo ""

# 7. Check build artifacts
echo -e "${YELLOW}7️⃣ Checking build artifacts...${NC}"
if [ -d "dist" ]; then
  DIST_SIZE=$(du -sh dist | cut -f1)
  echo -e "${GREEN}✅ dist/ directory exists${NC}"
  echo "   📦 Size: $DIST_SIZE"

  # Check for key files
  if [ -f "dist/index.html" ]; then
    echo -e "   ${GREEN}✅${NC} index.html found"
  fi
  if [ -f "dist/rss.xml" ]; then
    echo -e "   ${GREEN}✅${NC} rss.xml found"
  fi
  if [ -f "dist/sitemap-0.xml" ] || [ -f "dist/sitemap-index.xml" ]; then
    echo -e "   ${GREEN}✅${NC} sitemap found"
  fi
else
  echo -e "${RED}❌ dist/ directory not found${NC}"
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Deployment tests completed!${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "🌐 Production URL: $SITE_URL"
echo "📊 Vercel Dashboard: https://vercel.com/lukaszangerl-gmxats-projects/blog"
echo "💻 GitHub Repository: https://github.com/codeme-ne/neurohackingly"
echo ""
