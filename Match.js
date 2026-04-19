import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FOOTBALL_DIR = path.join(__dirname, "football");
const OUTPUT_FILE = path.join(FOOTBALL_DIR, "Hg.json");

if (!fs.existsSync(FOOTBALL_DIR)) fs.mkdirSync(FOOTBALL_DIR, { recursive: true });

async function main() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    const allMatches = [];

    try {
        console.log("🌐 جاري فتح الصفحة الرئيسية...");
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        await page.goto("https://koraplus.blog/", { waitUntil: 'networkidle2', timeout: 60000 });

        console.log("⏳ ننتظر تحميل العناصر...");
        await new Promise(r => setTimeout(r, 5000));

        const matchesData = await page.evaluate(() => {
            const results = [];
            const cards = document.querySelectorAll('a.match-card-link');

            cards.forEach((card) => {
                const article = card.querySelector('article.match-card');
                if (!article) return;

                const teamLogos = article.querySelectorAll('.team-logo img');
                const teamNames = article.querySelectorAll('.team-name');
                const scoreSpans = article.querySelectorAll('.match-score span');
                const status = article.querySelector('.match-status')?.textContent.trim() || "";
                const league = article.querySelector('.match-league')?.textContent.trim().replace('🏆 ', '') || "";
                const time = article.querySelector('.match-time')?.textContent.trim().replace('⏰ ', '') || "";
                const infoBarSpans = article.querySelectorAll('.match-info-bar span');

                let scoreText = "0 - 0";
                if (scoreSpans.length >= 3) {
                    scoreText = `${scoreSpans[0].textContent.trim()} - ${scoreSpans[2].textContent.trim()}`;
                }

                // التعديل هنا: وضع البيانات في المستوى الأول مباشرة
                results.push({
                    url: card.href,
                    status: status,
                    league: league,
                    time: time,
                    channel: infoBarSpans[0]?.textContent.trim().replace('📺 ', '') || "غير متوفر",
                    score: scoreText,
                    nameteam1: teamNames[0]?.textContent.trim() || "غير معروف",
                    logoteam1: teamLogos[0]?.getAttribute('src') || "",
                    nameteam2: teamNames[1]?.textContent.trim() || "غير معروف",
                    logoteam2: teamLogos[1]?.getAttribute('src') || ""
                });
            });
            return results;
        });

        console.log(`✅ وجدنا ${matchesData.length} مباراة. نبدأ باستخراج السيرفرات...`);

        for (let i = 0; i < matchesData.length; i++) {
            const match = matchesData[i];
            match.id = Math.floor(100000 + Math.random() * 900000);

            if (match.status !== "انتهت") {
                console.log(`🔍 جاري فحص: ${match.nameteam1} vs ${match.nameteam2}`);
                const matchPage = await browser.newPage();
                try {
                    await matchPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
                    await matchPage.goto(match.url, { waitUntil: 'networkidle2', timeout: 45000 });
                    
                    await matchPage.waitForSelector('iframe', { timeout: 15000 }).catch(() => null);

                    const serverLink = await matchPage.evaluate(() => {
                        const iframes = Array.from(document.querySelectorAll('iframe'));
                        const found = iframes.find(f => f.src && (f.src.includes('site88') || f.src.includes('serv=') || f.src.includes('p=')));
                        return found ? found.src : "";
                    });

                    // إضافة رابط السيرفر بجانب البيانات الأخرى مباشرة
                    match.watchServers = serverLink || "غير متوفر";
                    if (serverLink) console.log(`   ✨ تم العثور على السيرفر!`);

                } catch (e) {
                    match.watchServers = "خطأ في التحميل";
                }
                await matchPage.close();
            } else {
                match.watchServers = "المباراة انتهت";
            }

            allMatches.push(match);
            await new Promise(r => setTimeout(r, 1000));
        }

        const output = {
            scrapedAt: new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }),
            totalMatches: allMatches.length,
            matches: allMatches
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`\n🚀 تم الحفظ بنجاح في ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("❌ حدث خطأ كبير:", error.message);
    } finally {
        await browser.close();
    }
}

main();
