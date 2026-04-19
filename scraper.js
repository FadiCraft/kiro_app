import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. إعداد المجلدات (إنشاء مجلدات الأفلام، المسلسلات، والبرامج)
const DIRS = {
    movies: path.join(__dirname, "movies"),
    series: path.join(__dirname, "series"),
    tvshows: path.join(__dirname, "tvshows")
};

Object.values(DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

/**
 * دالة تحليل العناصر لاستخراج (العنوان، الرابط، الصورة، الجودة، القسم، المشاهدات، التقييم، رقم الحلقة)
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
    
    // استخراج رقم الحلقة إذا وجد (مهم للمسلسلات والبرامج الحديثة)
    const epNode = el.querySelector('.epNumb strong') || el.querySelector('.epNumb');
    const episode = epNode ? epNode.textContent.replace(/[^0-9]/g, '').trim() : null;

    if (!title || !link) return null;

    return {
        title,
        link,
        image,
        quality,
        category,
        views,
        imdb,
        ...(episode && { episode })
    };
}

// --- قسم الأفلام (Movies) ---
async function scrapeMovies() {
    try {
        const res = await fetch("https://www.fasel-hd.cam/all-movies", { headers: HEADERS });
        const doc = new JSDOM(await res.text()).window.document;
        
        const hafta = Array.from(doc.querySelectorAll('#owl-top-today .postDiv, .itemviews .postDiv'))
                           .filter(el => !el.closest('.all-items-listing')).map(parseElement).filter(Boolean);
        
        const yine = Array.from(doc.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv'))
                          .filter(el => !el.closest('#owl-top-today') && !el.closest('.owl-carousel')).map(parseElement).filter(Boolean);

        fs.writeFileSync(path.join(DIRS.movies, "hafta.json"), JSON.stringify(hafta, null, 2));
        fs.writeFileSync(path.join(DIRS.movies, "yine.json"), JSON.stringify(yine, null, 2));
        console.log(`✅ Movies: Hafta(${hafta.length}), Yine(${yine.length})`);
    } catch (e) { console.error("❌ Error Movies:", e.message); }
}

// --- قسم المسلسلات (Series) ---
async function scrapeSeries() {
    try {
        // أشهر المسلسلات
        const resH = await fetch("https://www.fasel-hd.cam/series", { headers: HEADERS });
        const docH = new JSDOM(await resH.text()).window.document;
        const hafta = Array.from(docH.querySelectorAll('.itemviews .postDiv, .owl-item .postDiv')).map(parseElement).filter(Boolean);

        // أحدث الحلقات
        const resY = await fetch("https://www.fasel-hd.cam/episodes", { headers: HEADERS });
        const docY = new JSDOM(await resY.text()).window.document;
        const yine = Array.from(docY.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv')).map(parseElement).filter(Boolean);

        fs.writeFileSync(path.join(DIRS.series, "hafta.json"), JSON.stringify(hafta, null, 2));
        fs.writeFileSync(path.join(DIRS.series, "yine.json"), JSON.stringify(yine, null, 2));
        console.log(`✅ Series: Hafta(${hafta.length}), Yine(${yine.length})`);
    } catch (e) { console.error("❌ Error Series:", e.message); }
}

// --- قسم البرامج التلفزيونية (TV Shows) ---
async function scrapeTVShows() {
    try {
        // أشهر البرامج
        const resH = await fetch("https://www.fasel-hd.cam/tvshows", { headers: HEADERS });
        const docH = new JSDOM(await resH.text()).window.document;
        const hafta = Array.from(docH.querySelectorAll('.itemviews .postDiv, .owl-item .postDiv')).map(parseElement).filter(Boolean);

        // أحدث حلقات البرامج
        const resY = await fetch("https://www.fasel-hd.cam/recent_tvshows", { headers: HEADERS });
        const docY = new JSDOM(await resY.text()).window.document;
        const yine = Array.from(docY.querySelectorAll('.col-xl-2 .postDiv, .col-lg-2 .postDiv')).map(parseElement).filter(Boolean);

        fs.writeFileSync(path.join(DIRS.tvshows, "hafta.json"), JSON.stringify(hafta, null, 2));
        fs.writeFileSync(path.join(DIRS.tvshows, "yine.json"), JSON.stringify(yine, null, 2));
        console.log(`✅ TV Shows: Hafta(${hafta.length}), Yine(${yine.length})`);
    } catch (e) { console.error("❌ Error TV Shows:", e.message); }
}

// تشغيل الاستخراج لجميع الأقسام
async function start() {
    console.log("🚀 جاري بدء تحديث البيانات الشامل...");
    await scrapeMovies();
    await scrapeSeries();
    await scrapeTVShows();
    console.log("🏁 تمت العملية بنجاح!");
}

start();
