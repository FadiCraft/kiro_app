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

        // دالة موحدة لاستخراج البيانات لضمان الجودة
        const parseMovie = (el) => {
            const link = el.querySelector('a')?.href;
            const title = el.querySelector('.h1')?.textContent?.trim();
            const image = el.querySelector('img')?.getAttribute('data-src') || el.querySelector('img')?.src;
            const quality = el.querySelector('.quality')?.textContent?.trim() || "";
            const category = el.querySelector('.cat')?.textContent?.trim() || "";
            const views = el.querySelector('.pViews')?.textContent?.replace(/[^0-9]/g, '') || "";
            const imdb = el.querySelector('.pImdb')?.textContent?.trim() || "";

            if (link && title) {
                return { title, link, image, quality, category, views, imdb };
            }
            return null;
        };

        // --- 1. استخراج "أشهر الأفلام" (hafta.json) ---
        const haftaMovies = [];
        // جربنا الاستهداف عن طريق id السلايدر مباشرة
        const haftaSection = doc.querySelector('#owl-top-today');
        if (haftaSection) {
            const items = haftaSection.querySelectorAll('.postDiv');
            items.forEach(el => {
                const data = parseMovie(el);
                if (data) haftaMovies.push(data);
            });
        }
        
        // إذا فشل الاستهداف بالـ id، نجرب البحث عن أي عنصر داخل owl-carousel في أعلى الصفحة
        if (haftaMovies.length === 0) {
            const firstCarousel = doc.querySelector('.owl-carousel');
            if (firstCarousel) {
                firstCarousel.querySelectorAll('.postDiv').forEach(el => {
                    const data = parseMovie(el);
                    if (data) haftaMovies.push(data);
                });
            }
        }

        // --- 2. استخراج "أحدث الأفلام" (yine.json) ---
        const yineMovies = [];
        // نستخدم نفس الـ selector الذي نجح معك سابقاً
        const yineElements = doc.querySelectorAll('.col-xl-2, .col-lg-2, .col-md-3');
        
        yineElements.forEach(el => {
            // نتأكد أننا لا نستخرج من السلايدر العلوي هنا
            if (!el.closest('#owl-top-today')) {
                const postDiv = el.querySelector('.postDiv');
                if (postDiv) {
                    const data = parseMovie(postDiv);
                    if (data) yineMovies.push(data);
                }
            }
        });

        // حفظ وتجديد الملفات
        fs.writeFileSync(HAFTA_FILE, JSON.stringify(haftaMovies, null, 2));
        fs.writeFileSync(YINE_FILE, JSON.stringify(yineMovies, null, 2));

        console.log(`✅ hafta.json: استخراج ${haftaMovies.length} فيلم`);
        console.log(`✅ yine.json: استخراج ${yineMovies.length} فيلم`);

    } catch (error) {
        console.error("❌ خطأ:", error.message);
        process.exit(1);
    }
}

scrapeFasel();
