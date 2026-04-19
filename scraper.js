import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIRS = {
    movies: path.join(__dirname, "movies"),
    series: path.join(__dirname, "series"),
    tv_show: path.join(__dirname, "tv_show"),
    asian_series: path.join(__dirname, "asian_series")
};

Object.values(DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

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
    const imdb = el.querySelector('.pImdb')?.textContent?.trim() || 
                 el.querySelector('span i.fa-star')?.parentElement?.textContent?.trim() || "";
    
    const epNode = el.querySelector('.epNumb strong') || el.querySelector('.epNumb');
    const episode = epNode ? epNode.textContent.replace(/[^0-9]/g, '').trim() : null;

    if (!title || !link) return null;

    return {
        title, link, image, quality, category, views, imdb,
        ...(episode && { episode })
    };
}

async function startScraping() {
    try {
        console.log("🚀 جاري بدء تحديث البيانات الشامل...");

        // 1. الأفلام
        const resMovies = await fetch("https://www.fasel-hd.cam/all-movies", { headers: HEADERS });
        const docMovies = new JSDOM(await resMovies.text()).window.document;
        const hMovies = Array.from(docMovies.querySelectorAll('.owl-item .postDiv, .itemviews .postDiv')).filter(el => !el.closest('.all-items-listing')).map(parseElement).filter(Boolean);
        const yMovies = Array.from(docMovies.querySelectorAll('.col-xl-2 .postDiv')).filter(el => !el.closest('.owl-carousel')).map(parseElement).filter(Boolean);
        fs.writeFileSync(path.join(DIRS.movies, "hafta.json"), JSON.stringify(hMovies.slice(0, 15), null, 2));
        fs.writeFileSync(path.join(DIRS.movies, "yine.json"), JSON.stringify(yMovies, null, 2));
        console.log(`✅ Movies: Hafta(${hMovies.length > 0 ? 10 : 0}), Yine(${yMovies.length})`);

        // 2. المسلسلات
        const resSeriesH = await fetch("https://www.fasel-hd.cam/series", { headers: HEADERS });
        const hSeries = Array.from(new JSDOM(await resSeriesH.text()).window.document.querySelectorAll('.owl-item .postDiv, .itemviews .postDiv')).map(parseElement).filter(Boolean);
        const resSeriesY = await fetch("https://www.fasel-hd.cam/episodes", { headers: HEADERS });
        const ySeries = Array.from(new JSDOM(await resSeriesY.text()).window.document.querySelectorAll('.col-xl-2 .postDiv')).map(parseElement).filter(Boolean);
        fs.writeFileSync(path.join(DIRS.series, "hafta.json"), JSON.stringify(hSeries.slice(0, 15), null, 2));
        fs.writeFileSync(path.join(DIRS.series, "yine.json"), JSON.stringify(ySeries, null, 2));
        console.log(`✅ Series: Hafta(${hSeries.length > 0 ? 10 : 0}), Yine(${ySeries.length})`);

        // 3. البرامج التلفزيونية
        const resTVH = await fetch("https://www.fasel-hd.cam/tvshows", { headers: HEADERS });
        const hTV = Array.from(new JSDOM(await resTVH.text()).window.document.querySelectorAll('.owl-item .postDiv, .itemviews .postDiv')).map(parseElement).filter(Boolean);
        const resTVY = await fetch("https://www.fasel-hd.cam/recent_tvshows", { headers: HEADERS });
        const yTV = Array.from(new JSDOM(await resTVY.text()).window.document.querySelectorAll('.col-xl-2 .postDiv')).map(parseElement).filter(Boolean);
        fs.writeFileSync(path.join(DIRS.tv_show, "hafta.json"), JSON.stringify(hTV.slice(0, 15), null, 2));
        fs.writeFileSync(path.join(DIRS.tv_show, "yine.json"), JSON.stringify(yTV, null, 2));
        console.log(`✅ TV Shows: Hafta(${hTV.length > 0 ? 10 : 0}), Yine(${yTV.length})`);

        // 4. المسلسلات الآسيوية (تم تعديل الـ Selector بناءً على الكود اللي أرسلته)
        const resAsianH = await fetch("https://www.fasel-hd.cam/asian-series", { headers: HEADERS });
        const docAsianH = new JSDOM(await resAsianH.text()).window.document;
        // هنا التعديل: نستهدف الـ postDiv داخل الـ owl-item مباشرة
        const hAsian = Array.from(docAsianH.querySelectorAll('.owl-item .postDiv')).map(parseElement).filter(Boolean);
        
        const resAsianY = await fetch("https://www.fasel-hd.cam/asian-episodes", { headers: HEADERS });
        const yAsian = Array.from(new JSDOM(await resAsianY.text()).window.document.querySelectorAll('.col-xl-2 .postDiv')).map(parseElement).filter(Boolean);
        
        fs.writeFileSync(path.join(DIRS.asian_series, "hafta.json"), JSON.stringify(hAsian.slice(0, 15), null, 2));
        fs.writeFileSync(path.join(DIRS.asian_series, "yine.json"), JSON.stringify(yAsian, null, 2));
        console.log(`✅ Asian Series: Hafta(${hAsian.length}), Yine(${yAsian.length})`);

        console.log("🏁 تمت المهمة بنجاح!");
    } catch (error) {
        console.error("❌ خطأ:", error.message);
    }
}

startScraping();
