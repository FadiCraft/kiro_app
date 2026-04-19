import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// إعدادات المسارات
const MOVIES_DIR = path.join(__dirname, "movies");
const HAFTA_FILE = path.join(MOVIES_DIR, "hafta.json");
const YINE_FILE = path.join(MOVIES_DIR, "yine.json");
const TARGET_URL = "https://www.fasel-hd.cam/all-movies";

// التأكد من وجود المجلد
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

        // 1. استخراج "أشهر الأفلام" (hafta.json)
        // الميزة: موجودة داخل owl-item
        const haftaMovies = [];
        const haftaElements = doc.querySelectorAll('.owl-item .postDiv');
        
        haftaElements.forEach(el => {
            const link = el.querySelector('a')?.href;
            const title = el.querySelector('.h1')?.textContent.trim();
            const image = el.querySelector('img')?.getAttribute('data-src') || el.querySelector('img')?.src;
            const quality = el.querySelector('.quality')?.textContent.trim();
            const views = el.querySelector('.pViews')?.textContent.trim();
            
            // استخراج التصنيفات (الأكشن، الجريمة...)
            const categories = Array.from(el.querySelectorAll('.cat')).map(c => c.textContent.trim());

            if (link && title) {
                haftaMovies.push({ title, link, image, quality, views, categories });
            }
        });

        // 2. استخراج "أحدث الأفلام" (yine.json)
        // الميزة: موجودة في نظام الشبكة (col-xl-2...)
        const yineMovies = [];
        const yineElements = doc.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv');

        yineElements.forEach(el => {
            const link = el.querySelector('a')?.href;
            const title = el.querySelector('.h1')?.textContent.trim();
            const image = el.querySelector('img')?.getAttribute('data-src') || el.querySelector('img')?.src;
            const quality = el.querySelector('.quality')?.textContent.trim();
            const imdb = el.querySelector('.pImdb')?.textContent.trim();
            const views = el.querySelector('.pViews')?.textContent.trim();
            const categories = Array.from(el.querySelectorAll('.cat')).map(c => c.textContent.trim());

            if (link && title) {
                yineMovies.push({ title, link, image, quality, imdb, views, categories });
            }
        });

        // حفظ الملفات (سيتم الكتابة فوق القديم تلقائياً)
        fs.writeFileSync(HAFTA_FILE, JSON.stringify({ total: haftaMovies.length, lastUpdated: new Date().toISOString(), movies: haftaMovies }, null, 2));
        fs.writeFileSync(YINE_FILE, JSON.stringify({ total: yineMovies.length, lastUpdated: new Date().toISOString(), movies: yineMovies }, null, 2));

        console.log(`✅ تم تحديث hafta.json بـ ${haftaMovies.length} فيلم`);
        console.log(`✅ تم تحديث yine.json بـ ${yineMovies.length} فيلم`);

    } catch (error) {
        console.error("❌ حدث خطأ أثناء الاستخراج:", error.message);
        process.exit(1);
    }
}

scrapeFasel();
