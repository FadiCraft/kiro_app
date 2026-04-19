import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOVIES_DIR = path.join(__dirname, "movies");
const HAFTA_FILE = path.join(MOVIES_DIR, "hafta.json");
const YINE_FILE = path.join(MOVIES_DIR, "yine.json");
const TARGET_URL = "https://www.fasel-hd.cam/all-movies";

if (!fs.existsSync(MOVIES_DIR)) {
    fs.mkdirSync(MOVIES_DIR, { recursive: true });
}

async function scrapeFasel() {
    try {
        const response = await fetch(TARGET_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
        });

        const html = await response.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        // --- 1. استخراج "أشهر الأفلام" (hafta.json) ---
        // الهيكل: owl-item active -> itemviews -> postDiv
        const haftaMovies = [];
        const haftaElements = doc.querySelectorAll('.owl-item .postDiv');

        haftaElements.forEach(el => {
            const link = el.querySelector('a')?.href;
            const title = el.querySelector('.h1')?.textContent?.trim();
            const image = el.querySelector('img')?.getAttribute('data-src') || el.querySelector('img')?.src;
            const quality = el.querySelector('.quality')?.textContent?.trim() || "";
            const category = el.querySelector('.cat')?.textContent?.trim() || "";
            const views = el.querySelector('.pViews')?.textContent?.replace(/[^0-9]/g, '') || "";

            if (link && title) {
                haftaMovies.push({ title, link, image, quality, category, views });
            }
        });

        // --- 2. استخراج "أحدث الأفلام" (yine.json) ---
        // الهيكل: col-xl-2 -> postDiv
        const yineMovies = [];
        const yineElements = doc.querySelectorAll('.col-xl-2.col-lg-2, .col-lg-2.col-md-3');

        yineElements.forEach(el => {
            const postDiv = el.querySelector('.postDiv');
            if (!postDiv) return;

            const link = postDiv.querySelector('a')?.href;
            const title = postDiv.querySelector('.h1')?.textContent?.trim();
            const image = postDiv.querySelector('img')?.getAttribute('data-src') || postDiv.querySelector('img')?.src;
            const quality = postDiv.querySelector('.quality')?.textContent?.trim() || "";
            const category = postDiv.querySelector('.cat')?.textContent?.trim() || "";
            const imdb = postDiv.querySelector('.pImdb')?.textContent?.trim() || "";
            const views = postDiv.querySelector('.pViews')?.textContent?.replace(/[^0-9]/g, '') || "";

            if (link && title) {
                yineMovies.push({ title, link, image, quality, category, imdb, views });
            }
        });

        // حفظ وتجديد الملفات
        fs.writeFileSync(HAFTA_FILE, JSON.stringify(haftaMovies, null, 2));
        fs.writeFileSync(YINE_FILE, JSON.stringify(yineMovies, null, 2));

        console.log(`✅ تم استخراج ${haftaMovies.length} فيلم لـ hafta.json`);
        console.log(`✅ تم استخراج ${yineMovies.length} فيلم لـ yine.json`);

    } catch (error) {
        console.error("❌ خطأ:", error.message);
        process.exit(1);
    }
}

scrapeFasel();
