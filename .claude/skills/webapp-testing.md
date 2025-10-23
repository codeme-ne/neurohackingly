# Webapp Testing Skill

Test and validate your web application deployment.

## Testing Checklist

### 1. Build Verification
- [ ] Local build completes without errors
- [ ] All pages generated successfully
- [ ] No console warnings or errors
- [ ] Build artifacts in dist/ directory

### 2. Deployment Verification
- [ ] Site is accessible at production URL
- [ ] SSL/TLS certificate is valid
- [ ] Response times are acceptable
- [ ] No 404 or 500 errors

### 3. Content Verification
- [ ] Homepage loads correctly
- [ ] Blog posts are accessible
- [ ] Images and assets load
- [ ] Links are not broken
- [ ] RSS feed is working

### 4. Functionality Testing
- [ ] Navigation works
- [ ] Search functionality (if applicable)
- [ ] Form submissions (if applicable)
- [ ] Client-side routing works

### 5. Performance Testing
- [ ] Lighthouse score > 90
- [ ] Page load time < 3s
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s

### 6. SEO & Accessibility
- [ ] Meta tags present
- [ ] Sitemap.xml generated
- [ ] Robots.txt configured
- [ ] Accessibility score > 90

## Quick Test Commands

```bash
# Build test
npm run build

# Local preview
npm run preview

# Check deployment status
vercel ls

# Test production URL
curl -I https://your-site.vercel.app

# Lighthouse audit
npx lighthouse https://your-site.vercel.app --view
```

## Automated Testing Script

```bash
#!/bin/bash
# test-deployment.sh

echo "🧪 Testing deployment..."

# 1. Build test
echo "1️⃣ Testing build..."
npm run build || exit 1

# 2. Check deployment
echo "2️⃣ Checking deployment..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://blog-cluwwwhci-lukaszangerl-gmxats-projects.vercel.app)
if [ "$STATUS" -eq 200 ]; then
  echo "✅ Site is live"
else
  echo "❌ Site returned status $STATUS"
  exit 1
fi

# 3. Check key pages
echo "3️⃣ Checking key pages..."
for page in "/" "/blog" "/newsletter"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://blog-cluwwwhci-lukaszangerl-gmxats-projects.vercel.app$page)
  echo "   $page: $STATUS"
done

echo "✅ All tests passed!"
```
