/**
 * Price Tracker Bot — scraper.mjs (Version Intégrale Hybride Anti-Détection)
 * --------------------------------------------------------
 * Architecture :
 * - Moteur A (Axios) : Utilisé pour Amazon et Boulanger (Plus rapide, évite les tanks Puppeteer).
 * - Moteur B (Puppeteer Stealth) : Utilisé pour Fnac/Darty avec simulation humaine.
 * - Base de données : Firebase Firestore.
 */

import { readFileSync, writeFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

// ─── 1. CONFIGURATION ET CONSTANTES ──────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
const SERVICE_ACCOUNT = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));

const DELAY_BETWEEN_REQUESTS_MS = 3000; 
const DEBUG_MODE = true;

// Activation du plugin Stealth pour masquer Puppeteer
puppeteer.use(StealthPlugin());

// Ton cookie Amazon de session
const MY_AMAZON_COOKIE = 'session-id=262-4324914-4420720; ubid-acbfr=261-1344164-6296102; csd-key=eyJ3YXNtVGVzdGVkIjp0cnVlLCJ3YXNtQ29tcGF0aWJsZSI6dHJ1ZSwid2ViQ3J5cHRvVGVzdGVkIjpmYWxzZSwidiI6MSwia2lkIjoiOThkNGZiIiwia2V5IjoiSkpoaGFUL2kzOHU0VFlCK3FYcDRWR0Y1ZVc5Y2RFNkkxTFFWSHVWQW9GQkFpTVA5UUVBYmN5MHVzdkVXR2syY2NGTUhYRDBKdUJSSzBSejJyRHVmcXJ0M3Vhc0phaXdPNlNDODN2VDd3dy9DVC9LbEZrdHJSKzRSc1V0aGEydVFndGJ2YXoyR29yRkFuK0UrdWtjWGpsSTRMZVk2TWVmYXlyTitmOHVUazdQQy9JejE0ZTJ4ZnJmYjd3ejg1RCtyWFlzM3VaVHRLWUtBYmNsemhrSGplWWd3TnJZeWZVOGxsNXYwMXF3WTRzWXo2a2h1Yld0U2Izd1hBdWZsWk1jSks4VDVDMU5DbldMOGplbHUvWDBoTVRZUkVpTGoycTBtbFpKcnJDSWZ6emEwQ3NzbTFNbUhrTmVieG5Sd0k0RHVlQS9HK2hsRmZGNGFBeVk5a0hKclRRPT0ifQ==; i18n-prefs=EUR; lc-acbfr=en_GB; session-id-time=2082787201l; bm_sv=84ED13BD03F6DA88E2A64DCA7FF23DF5~YAAQ7PvOF5PYQuCdAQAADpdCHB8mRFdrkMBx7C/s9WnZEx9knY8UkBonwXqpswHRu0qz2mEnE/MwamqBzGnbpp9Gp+634OHktBVt87JBQ2/Gj5g4YlEIFdzqQ0b3/h+T2y4zLCQeVYv+MiJmwvfUuL7M7naXSx4KUw2VsNPNDb5Q3yTO0S0BxfVA2y7LwzSssm4/N82NEZjKm1hp+tGXYadb3KboRRL53/cndJdzBrRWkTjG8v5u4g+jjZv5Fsxf~1; session-token=Rhw/k0gvCAzQpogGf4PniDGG6XOSHWXR7bK5nChBdNl8PqJDOVyfHbB77C1vXewUr3mjXLjEq8iGKygoRxD5OaC0McoEzjl3a7mJJEzKLhxOQ75sLOsSPmJpg8+uQSqvwaUBYQTf4y4peLR37n1xidmopG8goB+tnOeHAs47B5gYJ5+j1Yd6O94sscotpJ2FIrHrbB74yCmIAzXkrruz2XDxDOYdGoTO; rxc=ABx8G+48U5WvGWWXH+c; csm-hit=tb:FTCPKA5DN2XV112SVS0J+s-YA4E8F69Q6SVZ1H2E1QD|1778591181977&t:1778591181978&adb:adblk_no';

// ─── 2. INITIALISATION FIREBASE ──────────────────────────────────────────────

initializeApp({ credential: cert(SERVICE_ACCOUNT) });
const db = getFirestore();

// ─── 3. UTILITAIRES ──────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parsePrice(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot   = cleaned.lastIndexOf('.');
  let normalized;

  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }

  const price = parseFloat(normalized);
  return isNaN(price) ? null : price;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '').toLowerCase();
  } catch (e) {
    return null;
  }
}

// ─── 4. STRATÉGIES CSS PAR SITE ──────────────────────────────────────────────

const SITE_STRATEGIES = {
  'amazon.fr': [
    ($) => {
      const core = $('#corePriceDisplay_desktop_feature_div, #corePrice_desktop').first();
      const whole = core.find('.a-price-whole').first().text().replace(/[,.]/g, '').trim();
      const fraction = core.find('.a-price-fraction').first().text().trim();
      return whole ? `${whole}.${fraction || '00'}` : null;
    },
    ($) => $('#desktop_buybox .a-price .a-offscreen').first().text(),
    ($) => $('#price_inside_buybox').text()
  ],
  'fnac.com': [
    ($) => $('.f-priceBox-price').first().text(),
    ($) => $('.userPrice').first().text(),
    ($) => $('[data-autom="price"]').first().text(),
    ($) => $('.f-buyBox-price').first().text()
  ],
  'darty.com': [
    ($) => $('.product-price__price').first().text(),
    ($) => $('.price').first().text()
  ],
  'boulanger.com': [
    ($) => $('.price__amount').first().text(),
    ($) => $('.product-price').first().text()
  ]
};

function extractPriceFromJSONLD($) {
  let jsonPrice = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Product' || item['@type'] === 'ProductGroup') {
          if (item.offers) {
            const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            jsonPrice = offers.price || offers.lowPrice || null;
          }
        }
      }
    } catch (e) {}
  });
  return jsonPrice;
}

// ─── 5. MOTEURS DE RÉCUPÉRATION ──────────────────────────────────────────────

async function fetchWithAxios(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cookie': MY_AMAZON_COOKIE
      },
      timeout: 15000
    });
    return data;
  } catch (error) {
    console.error(`    🚨 Axios Error: ${error.message}`);
    return null;
  }
}

async function fetchWithPuppeteer(browser, url) {
  const page = await browser.newPage();
  try {
    // On simule une empreinte Macbook standard
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    
    // Ne pas bloquer tous les scripts, DataDome en a besoin pour se "calmer"
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    // Navigation
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // ─── SIMULATION HUMAINE ANTI-DATADOME ───
    // On bouge la souris de manière aléatoire
    await page.mouse.move(Math.random() * 500, Math.random() * 500);
    // On scrolle un peu pour faire croire à une lecture
    await page.evaluate(() => window.scrollBy(0, Math.random() * 500));
    await sleep(Math.floor(Math.random() * 2000) + 1000); 

    return await page.content();
  } catch (error) {
    console.error(`    🚨 Puppeteer Error: ${error.message}`);
    return null;
  } finally {
    await page.close();
  }
}

// ─── 6. FONCTION DE SCRAPING PRINCIPALE ──────────────────────────────────────

async function scrapePrice(browser, url) {
  console.log(`  🔍 Analyse : ${url}`);
  const domain = getDomain(url);
  
  let html = null;
  // Hybride : Amazon et Boulanger en Axios, les autres en Puppeteer
  if (domain === 'amazon.fr' || domain === 'boulanger.com') {
    html = await fetchWithAxios(url);
  } else {
    html = await fetchWithPuppeteer(browser, url);
  }

  if (!html) return null;

  const $ = cheerio.load(html);
  
  const title = $('title').text().toLowerCase();
  if (title.includes('robot check') || title.includes('pardonnez-nous')) {
    console.warn(`  🚨 Bloqué par ${domain} (Captcha/Anti-bot détecté).`);
    return null;
  }

  let finalPrice = null;

  const strategies = SITE_STRATEGIES[domain] || [];
  for (const strat of strategies) {
    finalPrice = parsePrice(String(strat($)));
    if (finalPrice) break;
  }

  if (!finalPrice) {
    finalPrice = parsePrice(String(extractPriceFromJSONLD($)));
  }

  if (!finalPrice) {
    const match = html.match(/"priceToPay"\s*:\s*"([^"]+)"/i) || html.match(/"price"\s*:\s*"([^"]+)"/i) || html.match(/"priceAmount":(\d+(\.\d+)?)/i);
    if (match) finalPrice = parsePrice(match[1] || match[2]);
  }

  if (!finalPrice && DEBUG_MODE) {
    const fileName = `error_${domain.split('.')[0]}_${Date.now()}.html`;
    writeFileSync(fileName, html, 'utf-8');
    console.log(`    💾 Debug : Page enregistrée sous ${fileName}`);
  }

  if (finalPrice) console.log(`  ✅ Prix trouvé : ${finalPrice} €`);
  return finalPrice;
}

// ─── 7. MISE À JOUR FIRESTORE ─────────────────────────────────────────────────

async function updateFirestore(docRef, newPrice, oldLowestPrice) {
  const today = new Date().toISOString().split('T')[0];
  const updateData = {
    currentPrice: newPrice,
    lastChecked: new Date(),
    priceHistory: FieldValue.arrayUnion({ date: today, price: newPrice })
  };

  if (!oldLowestPrice || newPrice < oldLowestPrice) {
    updateData.lowestPrice = newPrice;
    console.log(`  📉 NOUVEAU RECORD : ${newPrice} €`);
  }

  await docRef.update(updateData);
  console.log('  💾 Firestore mis à jour.');
}

// ─── 8. MAIN ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 DÉMARRAGE DU BOT (Hybride Anti-Détection)…\n');

  let browser;
  try {
    const snapshot = await db.collection('price_trackers').get();

    if (snapshot.empty) {
      console.log('ℹ️ Aucun produit trouvé dans Firestore.');
      return;
    }

    console.log(`📦 Traitement de ${snapshot.size} produit(s).\n`);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ]
    });

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.url) continue;

      const newPrice = await scrapePrice(browser, data.url);

      if (newPrice !== null) {
        await updateFirestore(doc.ref, newPrice, data.lowestPrice);
      } else {
        await doc.ref.update({ lastChecked: new Date() }).catch(() => {});
        console.log('  ⏭️ Prix non trouvé.');
      }

      console.log(`  ⏳ Pause de ${DELAY_BETWEEN_REQUESTS_MS / 1000}s…`);
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }

  } catch (error) {
    console.error('\n💥 ERREUR GLOBALE :', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 Navigateur fermé.');
    }
    console.log('✅ Cycle terminé.');
  }
}

main().catch((err) => {
  console.error('\n💥 CRASH CRITIQUE :', err);
  process.exit(1);
});