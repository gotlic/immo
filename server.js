/**
 * Serveur Next.js compatible Passenger (o2switch)
 * Passenger injecte le port via process.env.PORT
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");
const path = require("path");

const MIME = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  ".pdf": "application/pdf",
};

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = "localhost";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Servir les uploads directement (Next.js ne les sert pas via Passenger)
      if (parsedUrl.pathname && parsedUrl.pathname.startsWith("/uploads/")) {
        const filename = parsedUrl.pathname.slice("/uploads/".length);
        const filepath = path.join(__dirname, "public", "uploads", filename);
        try {
          const data = fs.readFileSync(filepath);
          const ext = path.extname(filename).toLowerCase();
          res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.end(data);
          return;
        } catch {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error:", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  })
    .once("error", (err) => { console.error(err); process.exit(1); })
    .listen(port, () => {
      console.log(`> Ready on port ${port} [${process.env.NODE_ENV}]`);
    });
});
