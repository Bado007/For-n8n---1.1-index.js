const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).send({ error: 'Missing LinkedIn URL' });
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

  try {
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    // Wait a little more in case of lazy content
    await page.waitForTimeout(3000);

    const rawHTML = await page.content();
    const plainText = await page.evaluate(() => document.body.innerText);

    await browser.close();

    return res.json({
      rawHTML,
      plainText,
    });
  } catch (error) {
    console.error('Scraping failed:', error.message);
    await browser.close();
    return res.status(500).send({
      error: 'Scraping failed. Possibly blocked or broken markup.',
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ LinkedIn scraper running on port ${PORT}`));
