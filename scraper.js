import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تعريف المجلدات بما فيها مجلد الصفحة الرئيسية الجديد
const DIRS = {
    movies: path.join(__dirname, "movies"),
    series: path.join(__dirname, "series"),
    tv_show: path.join(__dirname, "tv_show"),
    asian_series: path.join(__dirname, "asian_series"),
    anime: path.join(__dirname, "anime"),
    home: path.join(__dirname, "home_page")
};

Object.values(DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

// دالة التحليل العامة للأقسام العادية
function parseElement(el) {
    const a = el.querySelector('a');
    if (!a) return null;
    const img = el.querySelector('img');
    const title = el.querySelector('.h1')?.textContent?.trim() || el.querySelector('.h5')?.textContent?.trim() || "";
    const link = a.href || "";
    const image = img?.getAttribute('data-src') || img?.getAttribute('src') || "";
    const quality = el.querySelector('.quality')?.textContent?.trim() || "";
    const category = el.querySelector('.cat')?.textContent?.trim() || el.querySelector('.bCat')?.textContent?.trim() || "";
    const views = el.querySelector('.pViews')?.textContent?.replace(/[^0-9]/g, '') || el.querySelector('.bviews')?.textContent?.replace(/[^0-9]/g, '') || "";
    const imdb = el.querySelector('.pImdb')?.textContent?.trim() || el.querySelector('.bimdb')?.textContent?.trim() || 
                 el.querySelector('span i.fa-star')?.parentElement?.textContent?.trim() || "";
    const epNode = el.querySelector('.epNumb strong') || el.querySelector('.epNumb');
    const episode = epNode ? epNode.textContent.replace(/[^0-9]/g, '').trim() : null;

    if (!title || !link) return null;
    return { title, link, image, quality, category, views, imdb, ...(episode && { episode }) };
}

// دالة تحليل خاصة بالمسلسلات في الصفحة الرئيسية (epDivHome)
function parseHomeEpisode(el) {
    const a = el.querySelector('a.epHomeImg') || el.querySelector('a');
    if (!a) return null;
    const img = el.querySelector('img');
    const title = el.querySelector('.h4')?.textContent?.trim() || "";
    const link = a.href || "";
    const image = img?.getAttribute('data-src') || img?.getAttribute('src') || "";
    const status = el.querySelector('.epStatus')?.textContent?.trim() || "";
    const count = el.querySelector('span:not(.epStatus)')?.textContent?.trim() || "";

    if (!title || !link) return null;
    return { title, link, image, status, count };
}

async function startScraping() {
    try {
        console.log("🚀 جاري بدء التحديث الشامل للقاعدة...");

        // --- استخراج أقسام التصنيفات (Movies, Series, TV, Asian, Anime) ---
        const scrapeSection = async (urlH, urlY, dirKey, name, asianFix = false) => {
            const resH = await fetch(urlH, { headers: HEADERS });
            const docH = new JSDOM(await resH.text()).window.document;
            let hData = asianFix ? 
                Array.from(docH.querySelectorAll('.postDiv')).filter(el => (el.querySelector('a')?.href || "").includes('asian_seasons') && !el.closest('.all-items-listing')) :
                Array.from(docH.querySelectorAll('.owl-item .postDiv, .itemviews .postDiv')).filter(el => !el.closest('.all-items-listing'));

            const resY = await fetch(urlY, { headers: HEADERS });
            const yData = Array.from(new JSDOM(await resY.text()).window.document.querySelectorAll('.col-xl-2 .postDiv'));
            fs.writeFileSync(path.join(DIRS[dirKey], "hafta.json"), JSON.stringify(hData.map(parseElement).filter(Boolean).slice(0, 10), null, 2));
            fs.writeFileSync(path.join(DIRS[dirKey], "yine.json"), JSON.stringify(yData.map(parseElement).filter(Boolean).slice(0, 24), null, 2));
            console.log(`✅ ${name} Done`);
        };

        await scrapeSection("https://www.fasel-hd.cam/all-movies", "https://www.fasel-hd.cam/all-movies", "movies", "Movies");
        await scrapeSection("https://www.fasel-hd.cam/series", "https://www.fasel-hd.cam/episodes", "series", "Series");
        await scrapeSection("https://www.fasel-hd.cam/tvshows", "https://www.fasel-hd.cam/recent_tvshows", "tv_show", "TV Shows");
        await scrapeSection("https://www.fasel-hd.cam/asian-series", "https://www.fasel-hd.cam/asian-episodes", "asian_series", "Asian Series", true);
        await scrapeSection("https://www.fasel-hd.cam/anime", "https://www.fasel-hd.cam/recent_anime", "anime", "Anime");

        // --- استخراج بيانات الصفحة الرئيسية (Home Page) ---
        console.log("🏠 جاري استخراج بيانات الصفحة الرئيسية...");
        const resHome = await fetch("https://www.fasel-hd.cam/main", { headers: HEADERS });
        const docHome = new JSDOM(await resHome.text()).window.document;

        // 1. استخراج الأفلام من الصفحة الرئيسية (كلاس blockMovie)
        const homeMovies = Array.from(docHome.querySelectorAll('.blockMovie')).map(parseElement).filter(Boolean).slice(0, 24);
        fs.writeFileSync(path.join(DIRS.home, "movie.json"), JSON.stringify(homeMovies, null, 2));

        // 2. استخراج المسلسلات من الصفحة الرئيسية (كلاس epDivHome)
        const homeSeries = Array.from(docHome.querySelectorAll('.epDivHome')).map(parseHomeEpisode).filter(Boolean).slice(0, 24);
        fs.writeFileSync(path.join(DIRS.home, "series.json"), JSON.stringify(homeSeries, null, 2));

        console.log(`✅ Home Page: Movies(${homeMovies.length}), Series(${homeSeries.length})`);
        console.log("🏁 تمت المهمة بنجاح كامل!");
    } catch (e) { console.error("❌ خطأ:", e.message); }
}

startScraping();
