import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const distDir = resolve(process.cwd(), "dist");
const indexPath = resolve(distDir, "index.html");
const notFoundPath = resolve(distDir, "404.html");
const htaccessPath = resolve(distDir, ".htaccess");
const envPath = resolve(process.cwd(), ".env");
const envProductionPath = resolve(process.cwd(), ".env.production");

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
const hostingerRoutes = (
  env.VITE_HOSTINGER_STATIC_ROUTES ||
  "/home,/about,/books,/events,/spirituality,/counselling,/counseling,/event-details,/interlude-read-more,/gallery,/blog,/blog-details,/admin/blog"
)
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

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
  for (const route of hostingerRoutes) {
    const clean = route.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!clean) continue;
    const routeDir = resolve(distDir, clean);
    mkdirSync(routeDir, { recursive: true });
    copyFileSync(indexPath, resolve(routeDir, "index.html"));
  }
  console.log(`postbuild: host set to ${hostingProvider}; using .htaccess SPA fallback`);
}
