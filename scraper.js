import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOVIES_DIR = path.join(__dirname, "movies");
const SERIES_DIR = path.join(__dirname, "series");

// إنشاء المجلدات
if (!fs.existsSync(MOVIES_DIR)) fs.mkdirSync(MOVIES_DIR, { recursive: true });
if (!fs.existsSync(SERIES_DIR)) fs.mkdirSync(SERIES_DIR, { recursive: true });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

// --- دالة تحليل العناصر ---
function parseElement(el) {
    const a = el.querySelector('a');
    if (!a) return null;
    const img = el.querySelector('img');
    return {
        title: el.querySelector('.h1')?.textContent?.trim() || "",
        link: a.href || "",
        image: img?.getAttribute('data-src') || img?.getAttribute('src') || "",
        quality: el.querySelector('.quality')?.textContent?.trim() || "",
        category: el.querySelector('.cat')?.textContent?.trim() || "",
        views: el.querySelector('.pViews')?.textContent?.replace(/[^0-9]/g, '') || "",
        imdb: el.querySelector('.pImdb')?.textContent?.trim() || "",
        episode: el.querySelector('.epNumb strong')?.textContent?.trim() || ""
    };
}

// 1. استخراج أشهر الأفلام
async function getHaftaMovies() {
    const res = await fetch("https://www.fasel-hd.cam/all-movies", { headers: HEADERS });
    const doc = new JSDOM(await res.text()).window.document;
    const items = Array.from(doc.querySelectorAll('.owl-item .postDiv')).map(parseElement).filter(Boolean);
    fs.writeFileSync(path.join(MOVIES_DIR, "hafta.json"), JSON.stringify(items, null, 2));
    console.log(`✅ Hafta Movies: ${items.length}`);
}

// 2. استخراج أحدث الأفلام
async function getYineMovies() {
    const res = await fetch("https://www.fasel-hd.cam/all-movies", { headers: HEADERS });
    const doc = new JSDOM(await res.text()).window.document;
    const items = Array.from(doc.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv'))
                      .filter(el => !el.closest('.owl-carousel'))
                      .map(parseElement).filter(Boolean);
    fs.writeFileSync(path.join(MOVIES_DIR, "yine.json"), JSON.stringify(items, null, 2));
    console.log(`✅ Yine Movies: ${items.length}`);
}

// 3. استخراج أشهر المسلسلات
async function getHaftaSeries() {
    const res = await fetch("https://www.fasel-hd.cam/series", { headers: HEADERS });
    const doc = new JSDOM(await res.text()).window.document;
    const items = Array.from(doc.querySelectorAll('.owl-item .postDiv')).map(parseElement).filter(Boolean);
    fs.writeFileSync(path.join(SERIES_DIR, "hafta.json"), JSON.stringify(items, null, 2));
    console.log(`✅ Hafta Series: ${items.length}`);
}

// 4. استخراج أحدث الحلقات
async function getYineSeries() {
    const res = await fetch("https://www.fasel-hd.cam/episodes", { headers: HEADERS });
    const doc = new JSDOM(await res.text()).window.document;
    const items = Array.from(doc.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv')).map(parseElement).filter(Boolean);
    fs.writeFileSync(path.join(SERIES_DIR, "yine.json"), JSON.stringify(items, null, 2));
    console.log(`✅ Yine Series (Episodes): ${items.length}`);
}

// تشغيل الكل بشكل منفصل
async function runAll() {
    await getHaftaMovies();
    await getYineMovies();
    await getHaftaSeries();
    await getYineSeries();
}

runAll();
