import fs from "fs";
import path from "path";
import { create } from 'xmlbuilder2';
import { XMLParser } from 'fast-xml-parser';

const baseUrl = 'https://minijobgermany.de';
const pagesDir = './public';
const sitemapPath = './public/sitemap.xml';

// Format: 2025-03-10T15:17:50+00:00
function getCurrentISOTime() {
    const now = new Date();
    return now.toISOString().replace(/\.\d+Z$/, '+00:00');
}

function getAllHtmlFiles(dirPath, fileList = [], base = '') {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getAllHtmlFiles(filePath, fileList, path.join(base, file));
        } else if (file.endsWith('.html')) {
            fileList.push(path.join(base, file));
        }
    });
    return fileList;
}

function parseExistingSitemap(filePath) {
    if (!fs.existsSync(filePath)) return {};

    const xmlData = fs.readFileSync(filePath, 'utf8');
    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(xmlData);

    const urlList = json.urlset?.url || [];
    const map = {};

    (Array.isArray(urlList) ? urlList : [urlList]).forEach(entry => {
        const loc = entry.loc;
        const lastmod = entry.lastmod;
        const priority = entry.priority;
        if (loc) {
            map[loc] = { lastmod, priority };
        }
    });

    return map;
}

// Load previous entries (for preserving timestamps)
const existingMap = parseExistingSitemap(sitemapPath);

// Get all HTML file routes
const htmlFiles = getAllHtmlFiles(pagesDir);

// Build new sitemap
const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('urlset', {
        xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation':
            'http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd',
    });

htmlFiles.forEach(file => {
    const route = file.replace(/\\/g, '/').replace('index.html', '').replace(/\.html$/, '');
    const url = `${baseUrl}/${route}`.replace(/\/+$/, '/');

    const isHomepage = url === `${baseUrl}/`;
    const existingEntry = existingMap[url];

    const lastmod = existingEntry?.lastmod || getCurrentISOTime();
    const priority = isHomepage ? '1.00' : '0.80';

    const urlNode = root.ele('url');
    urlNode.ele('loc').txt(url);
    urlNode.ele('lastmod').txt(lastmod);
    urlNode.ele('priority').txt(priority);
});

const xml = root.end({ prettyPrint: true });
fs.writeFileSync(sitemapPath, xml);

console.log('📌 Sitemap generated successfully!');
