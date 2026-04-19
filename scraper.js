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
        // 1. استخراج الأفلام (hafta و yine)
        console.log("🎬 جاري استخراج الأفلام...");
        const resMovies = await fetch("https://www.fasel-hd.cam/all-movies", { headers: HEADERS });
        const docMovies = new JSDOM(await resMovies.text()).window.document;
        
        // --- hafta.json (أشهر الأفلام من السلايدر)
        const haftaMovies = [];
        docMovies.querySelectorAll('.owl-item .postDiv').forEach(el => {
            const data = parseElement(el);
            if (data) haftaMovies.push(data);
        });
        fs.writeFileSync(path.join(MOVIES_DIR, "hafta.json"), JSON.stringify(haftaMovies, null, 2));

        // --- yine.json (أحدث الأفلام من الشبكة col-xl-2)
        const yineMovies = [];
        docMovies.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv').forEach(el => {
            // نتأكد أنه ليس بداخل السلايدر لعدم التكرار
            if (!el.closest('.owl-carousel')) {
                const data = parseElement(el);
                if (data) yineMovies.push(data);
            }
        });
        fs.writeFileSync(path.join(MOVIES_DIR, "yine.json"), JSON.stringify(yineMovies, null, 2));

        // 2. استخراج أشهر المسلسلات (series/hafta.json)
        console.log("📺 جاري استخراج أشهر المسلسلات...");
        const resSeries = await fetch("https://www.fasel-hd.cam/series", { headers: HEADERS });
        const docSeries = new JSDOM(await resSeries.text()).window.document;
        
        const haftaSeries = [];
        docSeries.querySelectorAll('.owl-item .postDiv').forEach(el => {
            const data = parseElement(el);
            if (data) haftaSeries.push(data);
        });
        fs.writeFileSync(path.join(SERIES_DIR, "hafta.json"), JSON.stringify(haftaSeries, null, 2));

        // 3. استخراج أحدث الحلقات (series/yine.json)
        console.log("🔔 جاري استخراج أحدث الحلقات...");
        const resEps = await fetch("https://www.fasel-hd.cam/episodes", { headers: HEADERS });
        const docEps = new JSDOM(await resEps.text()).window.document;
        
        const yineSeries = [];
        docEps.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv').forEach(el => {
            const data = parseElement(el);
            if (data) yineSeries.push(data);
        });
        fs.writeFileSync(path.join(SERIES_DIR, "yine.json"), JSON.stringify(yineSeries, null, 2));

        console.log("✅ تمت العملية بنجاح!");

    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
}

function parseElement(el) {
    const a = el.querySelector('a');
    if (!a) return null;

    // استخراج رابط الصورة الصحيح
    const img = el.querySelector('img');
    const image = img?.getAttribute('data-src') || img?.getAttribute('src') || "";

    // استخراج رقم الحلقة إذا وجد (لـ yine.json الخاص بالمسلسلات)
    const epNode = el.querySelector('.epNumb strong');
    const episode = epNode ? epNode.textContent.trim() : null;

    return {
        title: el.querySelector('.h1')?.textContent?.trim() || "",
        link: a.href || "",
        image: image,
        quality: el.querySelector('.quality')?.textContent?.trim() || "",
        category: el.querySelector('.cat')?.textContent?.trim() || "",
        views: el.querySelector('.pViews')?.textContent?.replace(/[^0-9]/g, '') || "",
        imdb: el.querySelector('.pImdb')?.textContent?.trim() || "",
        ...(episode && { episode }) // يضاف فقط إذا كانت حلقة
    };
}

startScraping();
