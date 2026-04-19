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
        console.log(`🌐 جاري جلب الصفحة: ${TARGET_URL}`);
        const response = await fetch(TARGET_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const html = await response.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        // --- 1. أشهر الأفلام (hafta.json) ---
        // قمت بتغيير الـ Selector ليكون أكثر دقة ويستهدف العناصر داخل الـ carousel مباشرة
        const haftaMovies = [];
        const haftaElements = doc.querySelectorAll('#owl-top-today .itemviews .postDiv');
        
        console.log(`🔍 جاري فحص أشهر الأفلام، وجدت: ${haftaElements.length}`);

        haftaElements.forEach(el => {
            const link = el.querySelector('a')?.href;
            const title = el.querySelector('.h1')?.textContent.trim();
            const image = el.querySelector('img')?.getAttribute('data-src') || el.querySelector('img')?.src;
            const quality = el.querySelector('.quality')?.textContent.trim();
            const views = el.querySelector('.pViews')?.textContent.trim();
            
            // تعديل: استخراج تصنيف واحد فقط (أول واحد)
            const firstCategory = el.querySelector('.cat')?.textContent.trim() || "";

            if (link && title) {
                haftaMovies.push({ title, link, image, quality, views, category: firstCategory });
            }
        });

        // --- 2. أحدث الأفلام (yine.json) ---
        const yineMovies = [];
        const yineElements = doc.querySelectorAll('.all-items-listing .postDiv');

        console.log(`🔍 جاري فحص أحدث الأفلام، وجدت: ${yineElements.length}`);

        yineElements.forEach(el => {
            const link = el.querySelector('a')?.href;
            const title = el.querySelector('.h1')?.textContent.trim();
            const image = el.querySelector('img')?.getAttribute('data-src') || el.querySelector('img')?.src;
            const quality = el.querySelector('.quality')?.textContent.trim();
            const imdb = el.querySelector('.pImdb')?.textContent.trim();
            const views = el.querySelector('.pViews')?.textContent.trim();
            
            // تعديل: استخراج تصنيف واحد فقط
            const firstCategory = el.querySelector('.cat')?.textContent.trim() || "";

            if (link && title) {
                yineMovies.push({ title, link, image, quality, imdb, views, category: firstCategory });
            }
        });

        // حفظ وتجديد الملفات
        fs.writeFileSync(HAFTA_FILE, JSON.stringify(haftaMovies, null, 2));
        fs.writeFileSync(YINE_FILE, JSON.stringify(yineMovies, null, 2));

        console.log(`✅ تم تحديث hafta.json بـ ${haftaMovies.length} فيلم`);
        console.log(`✅ تم تحديث yine.json بـ ${yineMovies.length} فيلم`);

    } catch (error) {
        console.error("❌ حدث خطأ:", error.message);
        process.exit(1);
    }
}

scrapeFasel();
