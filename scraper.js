import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. إعداد المجلدات
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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Cache-Control': 'no-cache'
};

// 2. دالة التحليل العامة للأقسام
function parseElement(el) {
    const a = el.querySelector('a');
    if (!a) return null;
    const img = el.querySelector('img');
    const title = el.querySelector('.h1, .h5, .h4')?.textContent?.trim() || "";
    const link = a.href || "";
    const image = img?.getAttribute('data-src') || img?.getAttribute('src') || "";
    const quality = el.querySelector('.quality')?.textContent?.trim() || "";
    const category = el.querySelector('.cat, .bCat')?.textContent?.trim() || "";
    const views = el.querySelector('.pViews, .bviews')?.textContent?.replace(/[^0-9]/g, '') || "";
    const imdb = el.querySelector('.pImdb, .bimdb')?.textContent?.trim() || "";

    if (!title || !link) return null;
    return { title, link, image, quality, category, views, imdb };
}

async function startScraping() {
    try {
        console.log("🚀 جاري بدء تحديث البيانات الشامل (Overwrite Mode)...");

        // دالة سحب الأقسام (الأفلام، المسلسلات، الأنمي...)
        const scrapeSection = async (urlH, urlY, dirKey, name, isAsian = false) => {
            const resH = await fetch(urlH, { headers: HEADERS });
            const docH = new JSDOM(await resH.text()).window.document;
            let hData = isAsian ? 
                Array.from(docH.querySelectorAll('.postDiv')).filter(el => (el.querySelector('a')?.href || "").includes('asian_seasons')) :
                Array.from(docH.querySelectorAll('.owl-item .postDiv, .itemviews .postDiv'));
            
            const resY = await fetch(urlY, { headers: HEADERS });
            const yData = Array.from(new JSDOM(await resY.text()).window.document.querySelectorAll('.col-xl-2 .postDiv'));
            
            fs.writeFileSync(path.join(DIRS[dirKey], "hafta.json"), JSON.stringify(hData.map(parseElement).filter(Boolean).slice(0, 10), null, 2), { flag: 'w' });
            fs.writeFileSync(path.join(DIRS[dirKey], "yine.json"), JSON.stringify(yData.map(parseElement).filter(Boolean).slice(0, 24), null, 2), { flag: 'w' });
            console.log(`✅ ${name} Updated`);
        };

        // تشغيل الأقسام
        await scrapeSection("https://www.fasel-hd.cam/all-movies", "https://www.fasel-hd.cam/all-movies", "movies", "Movies");
        await scrapeSection("https://www.fasel-hd.cam/series", "https://www.fasel-hd.cam/episodes", "series", "Series");
        await scrapeSection("https://www.fasel-hd.cam/tvshows", "https://www.fasel-hd.cam/recent_tvshows", "tv_show", "TV Shows");
        await scrapeSection("https://www.fasel-hd.cam/asian-series", "https://www.fasel-hd.cam/asian-episodes", "asian_series", "Asian Series", true);
        await scrapeSection("https://www.fasel-hd.cam/anime", "https://www.fasel-hd.cam/recent_anime", "anime", "Anime");

        // 3. تحديث الصفحة الرئيسية (معالجة خاصة للـ 0)
        console.log("🏠 جاري استخراج بيانات الصفحة الرئيسية...");
        const resHome = await fetch("https://www.fasel-hd.cam/main", { headers: HEADERS });
        const docHome = new JSDOM(await resHome.text()).window.document;

        // استخراج الأفلام: نبحث عن أي عنصر يحتوي رابط فيلم
        const homeMovies = Array.from(docHome.querySelectorAll('.blockMovie, .postDiv'))
            .filter(el => {
                const href = el.querySelector('a')?.href || "";
                return href.includes('/movies/') || href.includes('/movie/');
            })
            .map(parseElement).filter(Boolean).slice(0, 24);

        // استخراج المسلسلات: نبحث عن كلاس epDivHome أو الروابط التي تحتوي episodes
        const homeSeries = Array.from(docHome.querySelectorAll('.epDivHome, .postDiv'))
            .filter(el => (el.querySelector('a')?.href || "").includes('/episodes/'))
            .map(el => {
                const a = el.querySelector('a');
                const img = el.querySelector('img');
                return {
                    title: el.querySelector('.h4, .h1, .h5')?.textContent?.trim() || "",
                    link: a?.href || "",
                    image: img?.getAttribute('data-src') || img?.getAttribute('src') || "",
                    status: el.querySelector('.epStatus')?.textContent?.trim() || "مستمر",
                    count: el.querySelector('span:not(.epStatus)')?.textContent?.trim() || ""
                };
            }).filter(item => item.title && item.link).slice(0, 24);

        fs.writeFileSync(path.join(DIRS.home, "movie.json"), JSON.stringify(homeMovies, null, 2), { flag: 'w' });
        fs.writeFileSync(path.join(DIRS.home, "series.json"), JSON.stringify(homeSeries, null, 2), { flag: 'w' });

        console.log(`✅ Home Page Updated: Movies(${homeMovies.length}), Series(${homeSeries.length})`);
        console.log("🏁 تمت المهمة بنجاح كامل!");

    } catch (e) {
        console.error("❌ خطأ أثناء التشغيل:", e.message);
    }
}

startScraping();
