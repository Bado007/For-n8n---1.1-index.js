const express = require('express');
const { chromium } = require('playwright');

const app = express();

// Use JSON body parser properly
app.use(express.json({ limit: '1mb' }));

app.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Missing LinkedIn URL' });
    }

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/114.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    await page.waitForTimeout(3000); // allow lazy content to load

    const rawHTML = await page.content();
    const plainText = await page.evaluate(() => document.body.innerText);

    await browser.close();

    return res.status(200).json({
      rawHTML,
      plainText,
    });
  } catch (err) {
    console.error('Scraping error:', err.message);
    return res.status(500).json({
      error: 'Scraping failed.',
      details: err.message,
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ LinkedIn scraper running on port ${PORT}`));
