const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send({ error: 'Missing LinkedIn URL' });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/114.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 20000,
    });

    // Slowly scroll to load all content
    await autoScroll(page);

    // Click "See more" buttons
    const seeMoreButtons = await page.$$('button:has-text("See more")');
    for (const btn of seeMoreButtons) {
      try {
        await btn.click({ timeout: 1000 });
        await page.waitForTimeout(500);
      } catch (err) {
        continue;
      }
    }

    await page.waitForTimeout(2000); // extra wait for content load

    const rawHTML = await page.content();
    const plainText = await page.evaluate(() => document.body.innerText);

    await browser.close();

    res.status(200).json({ rawHTML, plainText });
  } catch (err) {
    console.error('Scraping error:', err.message);
    await browser.close();
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
});

// Scroll function
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 200;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Scraper live on port ${PORT}`));
