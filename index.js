const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send({ error: 'Missing LinkedIn URL' });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/114.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // let content load

    const content = await page.content();
    const text = await page.evaluate(() => document.body.innerText);

    await browser.close();

    res.json({ rawHTML: content, plainText: text });
  } catch (err) {
    console.error(err);
    await browser.close();
    res.status(500).send({ error: 'Scraping failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
