import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOVIES_DIR = path.join(__dirname, "movies");
const SERIES_DIR = path.join(__dirname, "series");

[MOVIES_DIR, SERIES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

async function startScraping() {
    try {
        // --- 1. أشهر الأفلام (Movies -> hafta.json) ---
        console.log("🎬 جاري استخراج أشهر الأفلام...");
        const resMovies = await fetch("https://www.fasel-hd.cam/all-movies", { headers: HEADERS });
        const docMovies = new JSDOM(await resMovies.text()).window.document;
        
        const haftaMovies = [];
        // نبحث داخل الحاوية المخصصة لسلايدر اليوم/الأسبوع
        const movieSlider = docMovies.querySelector('#owl-top-today') || docMovies.querySelector('.owl-carousel');
        if (movieSlider) {
            movieSlider.querySelectorAll('.postDiv').forEach(el => {
                const item = parseElement(el);
                if (item) haftaMovies.push(item);
            });
        }
        fs.writeFileSync(path.join(MOVIES_DIR, "hafta.json"), JSON.stringify(haftaMovies, null, 2));

        // --- 2. أحدث الأفلام (Movies -> yine.json) ---
        const yineMovies = [];
        docMovies.querySelectorAll('.all-items-listing .postDiv').forEach(el => {
            const item = parseElement(el);
            if (item) yineMovies.push(item);
        });
        fs.writeFileSync(path.join(MOVIES_DIR, "yine.json"), JSON.stringify(yineMovies, null, 2));

        // --- 3. أشهر المسلسلات (Series -> hafta.json) ---
        console.log("📺 جاري استخراج أشهر المسلسلات...");
        const resSeries = await fetch("https://www.fasel-hd.cam/series", { headers: HEADERS });
        const docSeries = new JSDOM(await resSeries.text()).window.document;
        
        const haftaSeries = [];
        // في صفحة المسلسلات، نبحث عن السلايدر العلوي
        const seriesSlider = docSeries.querySelector('.owl-carousel');
        if (seriesSlider) {
            seriesSlider.querySelectorAll('.postDiv').forEach(el => {
                const item = parseElement(el);
                if (item) haftaSeries.push(item);
            });
        }
        fs.writeFileSync(path.join(SERIES_DIR, "hafta.json"), JSON.stringify(haftaSeries, null, 2));

        // --- 4. أحدث الحلقات (Series -> yine.json) ---
        console.log("🔔 جاري استخراج أحدث الحلقات...");
        const resEps = await fetch("https://www.fasel-hd.cam/episodes", { headers: HEADERS });
        const docEps = new JSDOM(await resEps.text()).window.document;
        
        const yineSeries = [];
        docEps.querySelectorAll('.all-items-listing .postDiv').forEach(el => {
            const item = parseElement(el);
            if (item) yineSeries.push(item);
        });
        fs.writeFileSync(path.join(SERIES_DIR, "yine.json"), JSON.stringify(yineSeries, null, 2));

        console.log(`✅ انتهى الاستخراج بنجاح!`);
        console.log(`- أفلام (أشهر/أحدث): ${haftaMovies.length}/${yineMovies.length}`);
        console.log(`- مسلسلات (أشهر/حلقات): ${haftaSeries.length}/${yineSeries.length}`);

    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
}

// دالة التحليل الموحدة
function parseElement(el) {
    const a = el.querySelector('a');
    if (!a) return null;

    return {
        title: el.querySelector('.h1')?.textContent?.trim() || "",
        link: a.href || "",
        image: el.querySelector('img')?.getAttribute('data-src') || el.querySelector('img')?.src || "",
        quality: el.querySelector('.quality')?.textContent?.trim() || "",
        category: el.querySelector('.cat')?.textContent?.trim() || "",
        views: el.querySelector('.pViews')?.textContent?.replace(/[^0-9]/g, '') || "",
        imdb: el.querySelector('.pImdb')?.textContent?.trim() || "",
        episode: el.querySelector('.epNumb strong')?.textContent?.trim() || ""
    };
}

startScraping();
