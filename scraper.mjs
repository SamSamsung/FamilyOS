/**
 * Price Tracker Bot — scraper.mjs (Version Intégrale Hybride Anti-Détection)
 * --------------------------------------------------------
 * Architecture :
 * - Moteur A (Axios + cookie) : Amazon, Boulanger, Fnac, Darty — session navigateur réelle.
 * - Moteur B (Puppeteer)      : Fallback pour tout domaine sans cookie configuré.
 * - Base de données           : Firebase Firestore.
 *
 * ⚠️  Renouvellement des cookies :
 *    Si le captcha réapparaît pour un site, ouvrir une page de ce site dans le
 *    navigateur, puis dans la console DevTools : document.cookie
 *    Coller la valeur dans la constante correspondante ci-dessous.
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

// Activation du plugin Stealth pour masquer Puppeteer (fallback)
puppeteer.use(StealthPlugin());

// ── Cookies de session par site ───────────────────────────────────────────────

// Amazon
const MY_AMAZON_COOKIE = 'session-id=262-4324914-4420720; ubid-acbfr=261-1344164-6296102; csd-key=eyJ3YXNtVGVzdGVkIjp0cnVlLCJ3YXNtQ29tcGF0aWJsZSI6dHJ1ZSwid2ViQ3J5cHRvVGVzdGVkIjpmYWxzZSwidiI6MSwia2lkIjoiOThkNGZiIiwia2V5IjoiSkpoaGFUL2kzOHU0VFlCK3FYcDRWR0Y1ZVc5Y2RFNkkxTFFWSHVWQW9GQkFpTVA5UUVBYmN5MHVzdkVXR2syY2NGTUhYRDBKdUJSSzBSejJyRHVmcXJ0M3Vhc0phaXdPNlNDODN2VDd3dy9DVC9LbEZrdHJSKzRSc1V0aGEydVFndGJ2YXoyR29yRkFuK0UrdWtjWGpsSTRMZVk2TWVmYXlyTitmOHVUazdQQy9JejE0ZTJ4ZnJmYjd3ejg1RCtyWFlzM3VaVHRLWUtBYmNsemhrSGplWWd3TnJZeWZVOGxsNXYwMXF3WTRzWXo2a2h1Yld0U2Izd1hBdWZsWk1jSks4VDVDMU5DbldMOGplbHUvWDBoTVRZUkVpTGoycTBtbFpKcnJDSWZ6emEwQ3NzbTFNbUhrTmVieG5Sd0k0RHVlQS9HK2hsRmZGNGFBeVk5a0hKclRRPT0ifQ==; i18n-prefs=EUR; lc-acbfr=en_GB; session-id-time=2082787201l; bm_sv=84ED13BD03F6DA88E2A64DCA7FF23DF5~YAAQ7PvOF5PYQuCdAQAADpdCHB8mRFdrkMBx7C/s9WnZEx9knY8UkBonwXqpswHRu0qz2mEnE/MwamqBzGnbpp9Gp+634OHktBVt87JBQ2/Gj5g4YlEIFdzqQ0b3/h+T2y4zLCQeVYv+MiJmwvfUuL7M7naXSx4KUw2VsNPNDb5Q3yTO0S0BxfVA2y7LwzSssm4/N82NEZjKm1hp+tGXYadb3KboRRL53/cndJdzBrRWkTjG8v5u4g+jjZv5Fsxf~1; session-token=Rhw/k0gvCAzQpogGf4PniDGG6XOSHWXR7bK5nChBdNl8PqJDOVyfHbB77C1vXewUr3mjXLjEq8iGKygoRxD5OaC0McoEzjl3a7mJJEzKLhxOQ75sLOsSPmJpg8+uQSqvwaUBYQTf4y4peLR37n1xidmopG8goB+tnOeHAs47B5gYJ5+j1Yd6O94sscotpJ2FIrHrbB74yCmIAzXkrruz2XDxDOYdGoTO; rxc=ABx8G+48U5WvGWWXH+c; csm-hit=tb:FTCPKA5DN2XV112SVS0J+s-YA4E8F69Q6SVZ1H2E1QD|1778591181977&t:1778591181978&adb:adblk_no';

// Fnac (à renouveler si captcha : ouvrir fnac.com → F12 → Console → document.cookie)
const MY_FNAC_COOKIE = 'kameleoonVisitorCode=hvowsw41r1fzbc44; UID=078e80822-ca53-490d-a578-c46414c7ab12; SID=43168e7d-fcee-4124-8d85-2174a66569cd; s_fid=7BA4AC8C7DDEA2C6-17EAE128177E9D39; s_vi=[CS]v1|34EEA8196A4D0435-6000126C061B0FD2[CE]; _gcl_au=1.1.183288427.1776111667; _tt_enable_cookie=1; _ttp=01KP482JE7EXZ0TF5D5VE57855_.tt.1; iadvize-3-consent=true; iadvize-3-vuid=382a18e7e40147d4994e883979380034cd8c8ca7dc2c4; OptanonAlertBoxClosed=2026-04-13T20:21:08.030Z; _scid=tyYLz9IfVv5iaEb0ggVYj6U7x0Rn3uTG; sbt=2a7e63faf2be6da5f0f620971dbff8b5; rlvt_clientId=5EAi0SiQ2dGWqpJnWl8m/iXgZeFN/PTdln1wx3vGo2TyEUgHcIFYqe/mk1zdDy7H; mics_vid=163434762176; _pin_unauth=dWlkPU1HVTJaRGMxT1dJdE5qUTRNQzAwWlRaaExUZ3daVGN0WVRCbU56WTBNalE0TjJGag; ORGN=fnac_google; OrderInSession=1; SDMTemplateNodePECookie=list; ItemPerPagelistTemplateNodePECookie=20; s_cc=true; VID=26202999-eaff-472c-a824-a53ebcdc55ee; _abck=8717279E5788B2DF12932F82C43BDB65~0~YAAQn9bOF8LX4R+eAQAAD2BnKg9Pd0btzjbmQecFSnysz2qu+5nsppnc16Y1qqqOK5Ym8yeOgccrfpge/x1X1fHq1og1rYd+SHdE4EHBGkSCwS7n9k+1Hm3wdqQ6qjUqV21uo+xoRgJIGsXnCD5bja3yBkBTXutA7Pu0YzQkopau39rLx90V+hfVXV/FcFA1hAAkMWPuoVDUNDkEOtfCN8VAI7DT5TdTVbC7IYAXeGSi/qXf6rjOy9UeHAiVFYmFF1WoRtg7jxBMTOuGG2WuZchicsTOQpGQcoFTtedIGYov51vdcHRraRGHKxNmSpYAwdWcFLn5p9iPzNps39hI5JdJqFHI3izEwajoazbRpHxOefi7G2c60RuF3wqPtKEt80um6VqJVLq9mHgOXBFmwu9WEAUZRvzgK5eX3Vmk7lvldJHQQ9sGWuyPD0i6vALX+2RUPtLRyU1tCyFrxi/eE0v8xUKyBgKZ0r6MlhgeYtiM3pVqPiVQYD1WZSAE4Pjgp6BHXIvULJsC8R2TgjbtP3dovVff2CvQrUJ09E8ysJI83oO23c0vLR+Wq9kkyM1S1f2LttpYcLCMEv3O5WQGNfvH95aMdBxy9XYIkoREvAn4o8gafYRAIqU=~-1~-1~-1~AAQAAAAF%2f%2f%2f%2f%2fzwNbIu3rrupt2yTom1xnnTbdXz+D+ikxD1JrPeMZaHMVropBcar%2f1x8s5U6C+NPeJSqpEZNXmZSHdY47Twb6iorJmIE8yUfUQbr~-1; PID=564654; LSI=AQFMBGkBACyDowEBC5f5AQDSzno=; OptanonConsent=isGpcEnabled=0&datestamp=Fri+May+15+2026+09%3A12%3A44+GMT%2B0200+(Central+European+Summer+Time)&version=202603.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=3c9dd8c7-73f1-4ac4-8483-3f4b597ec6e2&interactionCount=2&isAnonUser=1&prevHadToken=0&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0008%3A1%2CC0004%3A1%2CV2STACK42%3A1&intType=11&crTime=1776111668134&geolocation=IT%3B25&AwaitingReconsent=false; QueueITAccepted-SDFrts345E-V3_frprdfnaccom=EventId%3Dfrprdfnaccom%26RedirectType%3Dsafetynet%26IssueTime%3D1778829164%26Hash%3D91e14b46b9bf2e47d2d66d27a9db97747f45e7ee173deb94ccb29fbe42c7e4ec; bm_sv=6F743F68C14595C15F20F6F79CF845F1~YAAQn9bOFw4/4x+eAQAAWwJ7Kh9bc6ppYIRys5fCZJJeWss4TaZfF6Kt+RGz76dJoiqL+GNYbyan6Kae73zIlKB4N2rXdAFQiEzuMEX0Vi0BnyafaRg/X7mFw4Ava4nWtwnNyuXYclpFh02PTcR8TsSjklm2kZZxE4Kkr14+qGy83wsSq5lWINNc8TrNwe4U4tMuQQ7RRHQllN6EE7DGx5/mfHXaAAk5AgVorsY3e8LT5iflGWMC8nGeO5E9tGk=~1; _uetsid=7a8a48e0502a11f1a2e9ab9266f3f869; _uetvid=4d9c2550377611f1ad0fb9f8dad6e014; datadome=MdeT3pmCtsY1XHQ~HMDg3ycFCIoa~AaU9J8Y3siVoLYxKZJUs7Wqu1SOKFdOo84tMR~HfOtT82XUY8_DR2XCj~T_qwBae1r0MoG6n_~h_rJz_3FsUAGV5_doOuAMyMQK; bm_mi=0E3FACEE8F4CF5D6D0EE59AD7354A6DA~YAAQn9bOF4Lo4R+eAQAASjhoKh8P6XSnB8Ffu8JRfZIqIc6tCIeckDsnNS914BL9kvT0Dqt8lJsWZB2gZjo+I8nEbQik+GeJ4B3a7LIakQyhVSGRHTqJk26XUXsVTSlJ7IjpC4ArAllxzbBRxZKP8pxacaPYCQtlYniI+PK/Z+6h6KJkH1iQ1de9rT0iYmPlCwQRTMNJp8Ym6onmLNX7j+k1SgZZIu4HnqteESbNllNCipDXfgAsPIPWpKtSGD9llBGQEsOtLoQTBOhKgWzsQ/queG2uYLBeLMCuaP3SppiKIAxqhEerDSXVdN+Lt77MHoCcq0fMU7loLHM1YD9xMDAYAm2yY7fGRFgg9XdmRHv1/u+Vg5VJNY/gUZHoBqxmBebvkSgJmjp/zrCaFgyDfFZ5m1f0qv4kDDZ/5/majBje12RxzJy/w3ccYOdUhCVRuG95ub4lMWNGpw8IBvfe3ilN25XOzAHBnuCdKw==~1; bm_sz=DA86B549D711CC751AA9DEA264642D3F~YAAQn9bOF18+4x+eAQAAcPl6Kh9uorKPb4TB+nyc/b0qodxzAhTi5qBXEcW9AtYKjxwGBxI/dIuGL1+QaOq0T04phWtXlh+UWwSnQ3tu8eAmgVi8636IVweM9DTd5xt+L1FbqpDKPNi44D9CeBNImXE4o0DYdZaK2QckI5GD7AWIAPAvuuM7BBRrB9xDtUUGcDjcgZdFAIRIFbtHfKUe/n+zOOBUgDoNz+xn3LAaNYlzXaWsSHYlZjEn7ck5scAV8KYh/zdFb2DJmUawiHaryQVOIfbXgVUdX6zNhkaiBVMi+L7WmBaAXFENFhhk3YLBkSRApnx0yxux1ZL3gzzVlndvVg0xHe0KZ9MQwCJC66iUhAKIVlP9X51QxQao2CWzLx3F3rQ2fj45Bkq1bdrhxESD6m4XIHuFP2AtAbTuSL52FnV2W8cp9Z8r8rdHg+OJhe5anORyrGy8kkmxtzztBrece3CEmiY6t2oYvgb5qk/2Tc/oNQ==~4474182~3682626';

// Darty (à remplir : ouvrir darty.com → F12 → Console → document.cookie)
const MY_DARTY_COOKIE = '';

// Table de routage : domaine → cookie (undefined = domaine inconnu → Puppeteer)
const COOKIES = {
  'amazon.fr':     MY_AMAZON_COOKIE,
  'fnac.com':      MY_FNAC_COOKIE,
  'darty.com':     MY_DARTY_COOKIE,
  'boulanger.com': '',
};

// ─── 2. INITIALISATION FIREBASE ──────────────────────────────────────────────

initializeApp({ credential: cert(SERVICE_ACCOUNT) });
const db = getFirestore();

// ─── 3. UTILITAIRES ──────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parsePrice(raw) {
  if (!raw || (typeof raw !== 'string' && typeof raw !== 'number')) return null;
  const cleaned = String(raw).replace(/[^\d.,]/g, '');
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

// ─── 5. MOTEUR A : Axios + cookie de session ─────────────────────────────────

async function fetchWithAxios(url, cookie) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        ...(cookie ? { 'Cookie': cookie } : {})
      },
      timeout: 15000
    });
    return data;
  } catch (error) {
    console.error(`    🚨 Axios Error: ${error.message}`);
    return null;
  }
}

// ─── 6. MOTEUR B : Puppeteer Stealth (fallback domaine inconnu) ───────────────

async function fetchWithPuppeteer(browser, url) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    await page.mouse.move(Math.random() * 500, Math.random() * 500);
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

// ─── 7. FONCTION DE SCRAPING PRINCIPALE ──────────────────────────────────────

async function scrapePrice(browser, url) {
  console.log(`  🔍 Analyse : ${url}`);
  const domain = getDomain(url);
  const cookie = COOKIES[domain];

  let html = null;

  if (cookie !== undefined) {
    // Domaine connu → Axios avec cookie (chaîne vide = pas de cookie mais pas de Puppeteer)
    html = await fetchWithAxios(url, cookie);
  } else {
    // Domaine inconnu → Puppeteer Stealth en fallback
    html = await fetchWithPuppeteer(browser, url);
  }

  if (!html) return null;

  const $ = cheerio.load(html);

  const title = $('title').text().toLowerCase();
  if (title.includes('robot check') || title.includes('pardonnez-nous') || title.includes('datadome')) {
    console.warn(`  🚨 Bloqué par ${domain} — cookie expiré, à renouveler.`);
    return null;
  }

  let finalPrice = null;

  // Stratégies CSS site par site
  const strategies = SITE_STRATEGIES[domain] || [];
  for (const strat of strategies) {
    finalPrice = parsePrice(String(strat($)));
    if (finalPrice) break;
  }

  // Fallback JSON-LD
  if (!finalPrice) {
    finalPrice = parsePrice(String(extractPriceFromJSONLD($)));
  }

  // Fallback regex sur le HTML brut
  if (!finalPrice) {
    const match =
      html.match(/"priceToPay"\s*:\s*"([^"]+)"/i) ||
      html.match(/"price"\s*:\s*"([^"]+)"/i) ||
      html.match(/"priceAmount":(\d+(\.\d+)?)/i);
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

// ─── 8. MISE À JOUR FIRESTORE ─────────────────────────────────────────────────

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

// ─── 9. MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 DÉMARRAGE DU BOT (Hybride Anti-Détection)…\n');

  let browser;
  try {
    const snapshot = await db.collection('price_trackers').get();

    if (snapshot.empty) {
      console.log('ℹ️  Aucun produit trouvé dans Firestore.');
      return;
    }

    console.log(`📦 Traitement de ${snapshot.size} produit(s).\n`);

    browser = await puppeteer.launch({
      headless: 'new',
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
        console.log('  ⏭️  Prix non trouvé.');
      }

      console.log(`  ⏳ Pause de ${DELAY_BETWEEN_REQUESTS_MS / 1000}s…\n`);
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
