import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(process.cwd(), "dist");
const indexPath = resolve(distDir, "index.html");
const notFoundPath = resolve(distDir, "404.html");
const htaccessPath = resolve(distDir, ".htaccess");
const envPath = resolve(process.cwd(), ".env");
const envProductionPath = resolve(process.cwd(), ".env.production");
const dmcRoute = "/spirituality/discerning-ministry-class";
const requiredHostingerRoutes = [dmcRoute];

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf8");
  return content.split(/\r?\n/).reduce((acc, rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return acc;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) return acc;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    acc[key] = value;
    return acc;
  }, {});
}

function normalizeBasePath(value) {
  if (!value) return "/";
  let normalized = value.trim();
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (!normalized.endsWith("/")) normalized = `${normalized}/`;
  return normalized;
}

const fileEnv = {
  ...parseEnvFile(envPath),
  ...parseEnvFile(envProductionPath),
};
const env = { ...fileEnv, ...process.env };

const basePath = normalizeBasePath(env.VITE_BASE_PATH || "/");
const hostingProvider = (env.VITE_HOSTING_PROVIDER || "hostinger").trim().toLowerCase();
const siteUrl = (env.VITE_SITE_URL || "https://ttdaniel525.live").replace(/\/+$/, "");
const configuredHostingerRoutes = (
  env.VITE_HOSTINGER_STATIC_ROUTES ||
  "/home,/about,/books,/events,/spirituality,/counselling,/counseling,/event-details,/interlude-read-more,/gallery,/blog,/blog-details,/admin/blog"
)
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);
const hostingerRoutes = Array.from(
  new Set([...configuredHostingerRoutes, ...requiredHostingerRoutes])
);

function addDmcShareMetadata(html) {
  const title = "Discerning Ministry Class Registration | TT Daniel";
  const description =
    "Pre-register for the Discerning Ministry Class and receive class dates and participation details.";
  const canonicalUrl = `${siteUrl}${dmcRoute}/`;
  const shareImageUrl = `${siteUrl}/dmc-registration.png`;
  const socialMetadata = `
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${shareImageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${shareImageUrl}" />`;

  return html
    .replace(/<title>.*?<\/title>/i, `<title>${title}</title>`)
    .replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${description}" />`
    )
    .replace("</head>", `${socialMetadata}\n  </head>`);
}

mkdirSync(distDir, { recursive: true });

const htaccess = `<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set Strict-Transport-Security "max-age=31536000"
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase ${basePath}
  Options -MultiViews
  ErrorDocument 404 /404.html

  # Allow direct access to existing files/folders
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # SPA fallback to index.html
  RewriteRule ^ index.html [L]
</IfModule>
`;

writeFileSync(htaccessPath, htaccess, "utf8");

if (hostingProvider === "github-pages") {
  if (existsSync(indexPath)) {
    copyFileSync(indexPath, notFoundPath);
    console.log("postbuild: generated dist/404.html for GitHub Pages");
  }
} else {
  if (existsSync(indexPath)) {
    copyFileSync(indexPath, notFoundPath);
  }
  const indexHtml = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
  for (const route of hostingerRoutes) {
    const clean = route.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!clean) continue;
    const routeDir = resolve(distDir, clean);
    mkdirSync(routeDir, { recursive: true });
    const routeIndexPath = resolve(routeDir, "index.html");
    if (route === dmcRoute && indexHtml) {
      writeFileSync(routeIndexPath, addDmcShareMetadata(indexHtml), "utf8");
    } else {
      copyFileSync(indexPath, routeIndexPath);
    }
  }
  const dmcShareImageSource = resolve(process.cwd(), "src/assets/salvation.png");
  if (existsSync(dmcShareImageSource)) {
    copyFileSync(dmcShareImageSource, resolve(distDir, "dmc-registration.png"));
  }
  console.log(`postbuild: host set to ${hostingProvider}; using .htaccess SPA fallback`);
}
