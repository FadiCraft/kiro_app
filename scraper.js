import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOVIES_DIR = path.join(__dirname, "movies");
const SERIES_DIR = path.join(__dirname, "series");

// إنشاء المجلدات إذا لم تكن موجودة
if (!fs.existsSync(MOVIES_DIR)) fs.mkdirSync(MOVIES_DIR, { recursive: true });
if (!fs.existsSync(SERIES_DIR)) fs.mkdirSync(SERIES_DIR, { recursive: true });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

async function scrapeEverything() {
    try {
        // --- 1. الأفلام (أشهر الأفلام + أحدث الأفلام) ---
        console.log("⏳ جاري معالجة صفحة الأفلام...");
        const movieRes = await fetch("https://www.fasel-hd.cam/all-movies", { headers: HEADERS });
        const movieDoc = new JSDOM(await movieRes.text()).window.document;

        // أشهر الأفلام (Hafta)
        const haftaMovies = [];
        movieDoc.querySelectorAll('.owl-item .postDiv').forEach(el => {
            const data = parseData(el);
            if (data) haftaMovies.push(data);
        });
        fs.writeFileSync(path.join(MOVIES_DIR, "hafta.json"), JSON.stringify(haftaMovies, null, 2));

        // أحدث الأفلام (Yine)
        const yineMovies = [];
        movieDoc.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv').forEach(el => {
            if (!el.closest('.owl-carousel')) { // لضمان عدم تكرار أفلام السلايدر
                const data = parseData(el);
                if (data) yineMovies.push(data);
            }
        });
        fs.writeFileSync(path.join(MOVIES_DIR, "yine.json"), JSON.stringify(yineMovies, null, 2));


        // --- 2. أشهر المسلسلات (Series Hafta) ---
        console.log("⏳ جاري معالجة صفحة المسلسلات...");
        const seriesRes = await fetch("https://www.fasel-hd.cam/series", { headers: HEADERS });
        const seriesDoc = new JSDOM(await seriesRes.text()).window.document;

        const haftaSeries = [];
        seriesDoc.querySelectorAll('.owl-item .postDiv').forEach(el => {
            const data = parseData(el);
            if (data) haftaSeries.push(data);
        });
        fs.writeFileSync(path.join(SERIES_DIR, "hafta.json"), JSON.stringify(haftaSeries, null, 2));


        // --- 3. أحدث الحلقات (Episodes Yine) ---
        console.log("⏳ جاري معالجة صفحة الحلقات...");
        const epRes = await fetch("https://www.fasel-hd.cam/episodes", { headers: HEADERS });
        const epDoc = new JSDOM(await epRes.text()).window.document;

        const yineSeries = [];
        epDoc.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv').forEach(el => {
            const data = parseData(el);
            if (data) yineSeries.push(data);
        });
        fs.writeFileSync(path.join(SERIES_DIR, "yine.json"), JSON.stringify(yineSeries, null, 2));

        console.log("✅ اكتمل الاستخراج لجميع الأقسام بنجاح!");
        console.log(`📂 الأفلام: ${haftaMovies.length} (أشهر) | ${yineMovies.length} (أحدث)`);
        console.log(`📂 المسلسلات: ${haftaSeries.length} (أشهر) | ${yineSeries.length} (حلقات)`);

    } catch (err) {
        console.error("❌ خطأ قاتل:", err.message);
    }
}

// دالة التحليل الدقيقة
function parseData(el) {
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

scrapeEverything();
