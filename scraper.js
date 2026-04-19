import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// إعداد المسارات
const MOVIES_DIR = path.join(__dirname, "movies");
const SERIES_DIR = path.join(__dirname, "series");

// إنشاء المجلدات إذا لم تكن موجودة
if (!fs.existsSync(MOVIES_DIR)) fs.mkdirSync(MOVIES_DIR, { recursive: true });
if (!fs.existsSync(SERIES_DIR)) fs.mkdirSync(SERIES_DIR, { recursive: true });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

/**
 * دالة استخراج البيانات من عنصر HTML
 */
function parseElement(el) {
    const a = el.querySelector('a');
    if (!a) return null;

    const img = el.querySelector('img');
    const title = el.querySelector('.h1')?.textContent?.trim() || "";
    const link = a.href || "";
    const image = img?.getAttribute('data-src') || img?.getAttribute('src') || "";
    const quality = el.querySelector('.quality')?.textContent?.trim() || "";
    const category = el.querySelector('.cat')?.textContent?.trim() || "";
    const views = el.querySelector('.pViews')?.textContent?.replace(/[^0-9]/g, '') || "";
    const imdb = el.querySelector('.pImdb')?.textContent?.trim() || "";
    const epNum = el.querySelector('.epNumb strong')?.textContent?.trim() || "";

    if (!title || !link) return null;

    return {
        title,
        link,
        image,
        quality,
        category,
        views,
        imdb,
        ...(epNum && { episode: epNum })
    };
}

// 1. أشهر الأفلام (Movies Hafta)
async function getHaftaMovies() {
    try {
        const res = await fetch("https://www.fasel-hd.cam/all-movies", { headers: HEADERS });
        const doc = new JSDOM(await res.text()).window.document;
        
        // البحث في السلايدر العلوي بأكثر من Selector لضمان عدم الفشل
        const items = Array.from(doc.querySelectorAll('#owl-top-today .postDiv, .itemviews .postDiv'))
                           .filter(el => !el.closest('.all-items-listing')) // نتجنب القائمة السفلية
                           .map(parseElement)
                           .filter(Boolean);

        fs.writeFileSync(path.join(MOVIES_DIR, "hafta.json"), JSON.stringify(items, null, 2));
        console.log(`✅ Hafta Movies: ${items.length}`);
    } catch (e) { console.error("Error Hafta Movies:", e.message); }
}

// 2. أحدث الأفلام (Movies Yine)
async function getYineMovies() {
    try {
        const res = await fetch("https://www.fasel-hd.cam/all-movies", { headers: HEADERS });
        const doc = new JSDOM(await res.text()).window.document;
        
        const items = Array.from(doc.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv'))
                           .filter(el => !el.closest('#owl-top-today') && !el.closest('.owl-carousel'))
                           .map(parseElement)
                           .filter(Boolean);

        fs.writeFileSync(path.join(MOVIES_DIR, "yine.json"), JSON.stringify(items, null, 2));
        console.log(`✅ Yine Movies: ${items.length}`);
    } catch (e) { console.error("Error Yine Movies:", e.message); }
}

// 3. أشهر المسلسلات (Series Hafta)
async function getHaftaSeries() {
    try {
        const res = await fetch("https://www.fasel-hd.cam/series", { headers: HEADERS });
        const doc = new JSDOM(await res.text()).window.document;
        
        const items = Array.from(doc.querySelectorAll('.itemviews .postDiv, .owl-item .postDiv'))
                           .map(parseElement)
                           .filter(Boolean);

        fs.writeFileSync(path.join(SERIES_DIR, "hafta.json"), JSON.stringify(items, null, 2));
        console.log(`✅ Hafta Series: ${items.length}`);
    } catch (e) { console.error("Error Hafta Series:", e.message); }
}

// 4. أحدث الحلقات (Series Yine)
async function getYineSeries() {
    try {
        const res = await fetch("https://www.fasel-hd.cam/episodes", { headers: HEADERS });
        const doc = new JSDOM(await res.text()).window.document;
        
        const items = Array.from(doc.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv'))
                           .map(parseElement)
                           .filter(Boolean);

        fs.writeFileSync(path.join(SERIES_DIR, "yine.json"), JSON.stringify(items, null, 2));
        console.log(`✅ Yine Series: ${items.length}`);
    } catch (e) { console.error("Error Yine Series:", e.message); }
}

// تشغيل جميع العمليات بشكل متسلسل
async function run() {
    console.log("🚀 جاري بدء عملية الاستخراج الشاملة...");
    await getHaftaMovies();
    await getYineMovies();
    await getHaftaSeries();
    await getYineSeries();
    console.log("🏁 انتهت العملية بالكامل.");
}

run();
