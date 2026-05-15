import axios from 'axios';
import * as cheerio from 'cheerio';

async function checkPrice(url) {
  console.log(`🔍 Analyse de la page : ${url}`);
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      }
    });

    const $ = cheerio.load(data);
    let finalPrice = null;

    // --- STRATÉGIE DE RECHERCHE MULTIPLE ---
    
    // Stratégie 1 : Le bloc de prix standard (la plus précise)
    const standardPriceArea = $('#corePriceDisplay_desktop_feature_div, #corePrice_desktop').first();
    if (standardPriceArea.length > 0) {
      let whole = standardPriceArea.find('.a-price-whole').first().text().replace(/[,.]/g, '').trim();
      let fraction = standardPriceArea.find('.a-price-fraction').first().text().trim();
      if (whole) finalPrice = parseFloat(`${whole}.${fraction || '00'}`);
    }

    // Stratégie 2 : Le prix affiché dans la "Buy Box" sur le côté droit (très fiable)
    if (!finalPrice) {
      const buyBoxPrice = $('#desktop_buybox').find('.a-price .a-offscreen').first().text();
      if (buyBoxPrice) {
         // Le texte ressemble à "44,99 €" ou "€44.99"
         const cleanString = buyBoxPrice.replace(/[^\d.,]/g, '').replace(',', '.');
         if (cleanString) finalPrice = parseFloat(cleanString);
      }
    }

    // Stratégie 3 : Recherche générique du premier prix caché (souvent le bon sur les pages complexes)
    if (!finalPrice) {
      const offscreenPrice = $('#apex_desktop').find('.a-price .a-offscreen').first().text();
      if (offscreenPrice) {
         const cleanString = offscreenPrice.replace(/[^\d.,]/g, '').replace(',', '.');
         if (cleanString) finalPrice = parseFloat(cleanString);
      }
    }

    // --- RÉSULTAT ---
    if (finalPrice && !isNaN(finalPrice)) {
      console.log(`✅ Prix exact du produit trouvé : ${finalPrice} €`);
      return finalPrice;
    } else {
      console.log("❌ Impossible de trouver le prix. Soit Amazon a bloqué la requête (Captcha), soit le produit est indisponible.");
      return null;
    }

  } catch (error) {
    if (error.response && error.response.status === 503) {
      console.error("🚨 Amazon a bloqué la requête (Erreur 503 : Captcha requis).");
    } else {
      console.error("🚨 Erreur lors du scan :", error.message);
    }
    return null;
  }
}

// === TEST ===
const urlTest = "https://www.amazon.fr/-/en/Newest-vibrant-Bluetooth-speaker-Charcoal/dp/B09B8X9RGM/"; 

checkPrice(urlTest);