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

    return { title, link, image, quality, category, views, imdb, ...(episode && { episode }) };
}

async function startScraping() {
    try {
        console.log("🚀 جاري بدء تحديث البيانات الشامل...");

        // --- 1. الأفلام ---
        const resM = await fetch("https://www.fasel-hd.cam/all-movies", { headers: HEADERS });
        const docM = new JSDOM(await resM.text()).window.document;
        const hM = Array.from(docM.querySelectorAll('#owl-top-today .postDiv, .itemviews .postDiv')).filter(el => !el.closest('.all-items-listing')).map(parseElement).filter(Boolean);
        const yM = Array.from(docM.querySelectorAll('.col-xl-2 .postDiv')).filter(el => !el.closest('.owl-carousel')).map(parseElement).filter(Boolean);
        fs.writeFileSync(path.join(DIRS.movies, "hafta.json"), JSON.stringify(hM.slice(0, 10), null, 2));
        fs.writeFileSync(path.join(DIRS.movies, "yine.json"), JSON.stringify(yM.slice(0, 24), null, 2));
        console.log(`✅ Movies: Hafta(${Math.min(hM.length, 10)}), Yine(${yM.length})`);

        // --- 2. المسلسلات ---
        const resS = await fetch("https://www.fasel-hd.cam/series", { headers: HEADERS });
        const docS = new JSDOM(await resS.text()).window.document;
        const hS = Array.from(docS.querySelectorAll('.owl-item .postDiv, .itemviews .postDiv')).map(parseElement).filter(Boolean);
        const resSY = await fetch("https://www.fasel-hd.cam/episodes", { headers: HEADERS });
        const yS = Array.from(new JSDOM(await resSY.text()).window.document.querySelectorAll('.col-xl-2 .postDiv')).map(parseElement).filter(Boolean);
        fs.writeFileSync(path.join(DIRS.series, "hafta.json"), JSON.stringify(hS.slice(0, 10), null, 2));
        fs.writeFileSync(path.join(DIRS.series, "yine.json"), JSON.stringify(yS.slice(0, 24), null, 2));
        console.log(`✅ Series: Hafta(${Math.min(hS.length, 10)}), Yine(${yS.length})`);

        // --- 3. البرامج ---
        const resT = await fetch("https://www.fasel-hd.cam/tvshows", { headers: HEADERS });
        const docT = new JSDOM(await resT.text()).window.document;
        const hT = Array.from(docT.querySelectorAll('.owl-item .postDiv, .itemviews .postDiv')).map(parseElement).filter(Boolean);
        const resTY = await fetch("https://www.fasel-hd.cam/recent_tvshows", { headers: HEADERS });
        const yT = Array.from(new JSDOM(await resTY.text()).window.document.querySelectorAll('.col-xl-2 .postDiv')).map(parseElement).filter(Boolean);
        fs.writeFileSync(path.join(DIRS.tv_show, "hafta.json"), JSON.stringify(hT.slice(0, 10), null, 2));
        fs.writeFileSync(path.join(DIRS.tv_show, "yine.json"), JSON.stringify(yT.slice(0, 24), null, 2));
        console.log(`✅ TV Shows: Hafta(${Math.min(hT.length, 10)}), Yine(${yT.length})`);

        // --- 4. المسلسلات الآسيوية ---
        const resA = await fetch("https://www.fasel-hd.cam/asian-series", { headers: HEADERS });
        const docA = new JSDOM(await resA.text()).window.document;
        const hA = Array.from(docA.querySelectorAll('.postDiv'))
                        .filter(el => {
                            const link = el.querySelector('a')?.href || "";
                            return link.includes('asian_seasons') && !el.closest('.all-items-listing');
                        })
                        .map(parseElement).filter(Boolean);

        const resAY = await fetch("https://www.fasel-hd.cam/asian-episodes", { headers: HEADERS });
        const yA = Array.from(new JSDOM(await resAY.text()).window.document.querySelectorAll('.col-xl-2 .postDiv')).map(parseElement).filter(Boolean);
        
        fs.writeFileSync(path.join(DIRS.asian_series, "hafta.json"), JSON.stringify(hA.slice(0, 10), null, 2));
        fs.writeFileSync(path.join(DIRS.asian_series, "yine.json"), JSON.stringify(yA.slice(0, 24), null, 2));
        console.log(`✅ Asian Series: Hafta(${Math.min(hA.length, 10)}), Yine(${yA.length})`);

        console.log("🏁 تمت العملية!");
    } catch (e) { console.error("❌ Error:", e.message); }
}

startScraping();
