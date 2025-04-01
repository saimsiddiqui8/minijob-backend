import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { create } from 'xmlbuilder2';
import { XMLParser } from 'fast-xml-parser';

const baseUrl = 'https://minijobgermany.de';

// Simulate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sitemap output location
const sitemapPath = path.resolve(__dirname, '../sitemap.xml');
// HTML pages folder (your site root)
const pagesDir = path.resolve(__dirname, '../');

// Ignored HTML files and folders
const IGNORED_FILES = ['404.html'];
const IGNORED_DIRS = ['api', 'node_modules', 'scripts', '.git'];

// Format: 2025-03-10T15:17:50+00:00
function getCurrentISOTime() {
    return new Date().toISOString().replace(/\.\d+Z$/, '+00:00');
}

// Recursively find HTML files
function getAllHtmlFiles(dirPath, fileList = [], base = '') {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!IGNORED_DIRS.includes(file)) {
                getAllHtmlFiles(filePath, fileList, path.join(base, file));
            }
        } else if (file.endsWith('.html') && !IGNORED_FILES.includes(file)) {
            fileList.push(path.join(base, file));
        }
    }
    return fileList;
}

// Parse old sitemap to preserve <lastmod>
function parseExistingSitemap(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const xmlData = fs.readFileSync(filePath, 'utf8');
    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(xmlData);

    const urls = json.urlset?.url || [];
    const map = {};

    (Array.isArray(urls) ? urls : [urls]).forEach(entry => {
        const loc = entry.loc;
        if (loc) {
            map[loc] = {
                lastmod: entry.lastmod,
                priority: entry.priority
            };
        }
    });

    return map;
}

// Load previous sitemap data
const existingMap = parseExistingSitemap(sitemapPath);
const htmlFiles = getAllHtmlFiles(pagesDir);

// Create new sitemap XML
const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('urlset', {
    xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:schemaLocation':
        'http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd',
});

htmlFiles.forEach(file => {
    const route = file.replace(/\\/g, '/').replace('index.html', '').replace(/\.html$/, '');
    const finalPath = route.startsWith('in-') ? route.replace(/^in-/, 'minijob-') : route;
    const url = `${baseUrl}/${finalPath}`.replace(/\/+$/, '/');

    const isHomepage = url === `${baseUrl}/`;
    const existing = existingMap[url];
    const lastmod = existing?.lastmod || getCurrentISOTime();
    const priority = isHomepage ? '1.00' : '0.80';

    const urlNode = root.ele('url');
    urlNode.ele('loc').txt(url);
    urlNode.ele('lastmod').txt(lastmod);
    urlNode.ele('priority').txt(priority);
});

// Write final sitemap
const xml = root.end({ prettyPrint: true });
fs.writeFileSync(sitemapPath, xml);
console.log('✅ Sitemap generated successfully at:', sitemapPath);
