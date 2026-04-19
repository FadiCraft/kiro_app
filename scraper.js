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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const html = await response.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        // دالة مساعدة لاستخراج البيانات من عنصر الفيلم
        const extractMovieData = (el) => {
            const link = el.querySelector('a')?.href;
            const title = el.querySelector('.h1, h1, .title')?.textContent?.trim();
            const image = el.querySelector('img')?.getAttribute('data-src') || 
                          el.querySelector('img')?.getAttribute('data-lazy-src') || 
                          el.querySelector('img')?.src;
            const quality = el.querySelector('.quality')?.textContent?.trim() || "";
            const views = el.querySelector('.pViews')?.textContent?.trim() || "";
            const category = el.querySelector('.cat')?.textContent?.trim() || "";
            const imdb = el.querySelector('.pImdb')?.textContent?.trim() || "";

            if (link && title) {
                return { title, link, image, quality, views, category, imdb };
            }
            return null;
        };

        // --- 1. استخراج "أشهر الأفلام" (hafta.json) ---
        // نبحث داخل الـ Carousel المخصص لأشهر الأفلام
        const haftaMovies = [];
        const haftaContainer = doc.querySelector('#owl-top-today') || doc.querySelector('.owl-carousel');
        
        if (haftaContainer) {
            const items = haftaContainer.querySelectorAll('.postDiv');
            items.forEach(item => {
                const data = extractMovieData(item);
                if (data) haftaMovies.push(data);
            });
        }

        // --- 2. استخراج "أحدث الأفلام" (yine.json) ---
        // نبحث في الجزء السفلي (القائمة الشاملة)
        const yineMovies = [];
        // نستخدم selector عام للـ Grid الذي يحتوي الأفلام
        const yineElements = doc.querySelectorAll('.all-items-listing .postDiv, .items .postDiv');

        yineElements.forEach(item => {
            // نتأكد أن الفيلم ليس جزءاً من السلايدر العلوي
            if (!item.closest('#owl-top-today')) {
                const data = extractMovieData(item);
                if (data) yineMovies.push(data);
            }
        });

        // حفظ البيانات
        fs.writeFileSync(HAFTA_FILE, JSON.stringify(haftaMovies, null, 2));
        fs.writeFileSync(YINE_FILE, JSON.stringify(yineMovies, null, 2));

        console.log(`✅ hafta.json: تم استخراج ${haftaMovies.length} فيلم`);
        console.log(`✅ yine.json: تم استخراج ${yineMovies.length} فيلم`);

    } catch (error) {
        console.error("❌ فشل الاستخراج:", error.message);
        process.exit(1);
    }
}

scrapeFasel();
