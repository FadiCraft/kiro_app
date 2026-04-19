import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// إعداد المسارات
const MOVIES_DIR = path.join(__dirname, "movies");
const SERIES_DIR = path.join(__dirname, "series");

// التأكد من وجود المجلدات
[MOVIES_DIR, SERIES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

// دالة عامة لجلب الـ HTML وتحويله لـ DOM
async function getDoc(url) {
    const res = await fetch(url, { headers: HEADERS });
    const html = await res.text();
    return new JSDOM(html).window.document;
}

// دالة استخراج بيانات العنصر (فيلم، مسلسل، حلقة)
function parseItem(el) {
    const link = el.querySelector('a')?.href;
    const title = el.querySelector('.h1')?.textContent?.trim();
    const image = el.querySelector('img')?.getAttribute('data-src') || el.querySelector('img')?.src;
    const quality = el.querySelector('.quality')?.textContent?.trim() || "";
    const category = el.querySelector('.cat')?.textContent?.trim() || "";
    const views = el.querySelector('.pViews')?.textContent?.replace(/[^0-9]/g, '') || "";
    const epNumber = el.querySelector('.epNumb strong')?.textContent?.trim() || ""; // خاص بالحلقات

    if (link && title) {
        return { title, link, image, quality, category, views, ...(epNumber && { episode: epNumber }) };
    }
    return null;
}

async function startScraping() {
    try {
        // --- 1. الأفلام (Movies) ---
        console.log("🎬 جاري معالجة الأفلام...");
        const movieDoc = await getDoc("https://www.fasel-hd.cam/all-movies");
        
        const haftaMovies = Array.from(movieDoc.querySelectorAll('#owl-top-today .postDiv')).map(parseItem).filter(Boolean);
        const yineMovies = Array.from(movieDoc.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv'))
                                .filter(el => !el.closest('#owl-top-today'))
                                .map(parseItem).filter(Boolean);

        fs.writeFileSync(path.join(MOVIES_DIR, "hafta.json"), JSON.stringify(haftaMovies, null, 2));
        fs.writeFileSync(path.join(MOVIES_DIR, "yine.json"), JSON.stringify(yineMovies, null, 2));

        // --- 2. أشهر المسلسلات (Series - hafta) ---
        console.log("📺 جاري معالجة أشهر المسلسلات...");
        const seriesDoc = await getDoc("https://www.fasel-hd.cam/series");
        const popularSeries = Array.from(seriesDoc.querySelectorAll('.owl-item .postDiv')).map(parseItem).filter(Boolean);
        fs.writeFileSync(path.join(SERIES_DIR, "hafta.json"), JSON.stringify(popularSeries, null, 2));

        // --- 3. أحدث الحلقات (Episodes - yine) ---
        console.log("🔔 جاري معالجة أحدث الحلقات...");
        const episodesDoc = await getDoc("https://www.fasel-hd.cam/episodes");
        const latestEpisodes = Array.from(episodesDoc.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv')).map(parseItem).filter(Boolean);
        fs.writeFileSync(path.join(SERIES_DIR, "yine.json"), JSON.stringify(latestEpisodes, null, 2));

        console.log("✅ اكتملت العملية بنجاح!");
    } catch (err) {
        console.error("❌ حدث خطأ:", err.message);
    }
}

startScraping();
