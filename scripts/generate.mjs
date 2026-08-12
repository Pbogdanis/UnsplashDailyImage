import { writeFileSync } from "node:fs";

const key = process.env.UNSPLASH_ACCESS_KEY;
if (!key) throw new Error("Missing UNSPLASH_ACCESS_KEY secret");

const collection = process.env.COLLECTION_ID || "";
const query = process.env.SEARCH_QUERY || "";
const topics = (process.env.TOPIC_SLUGS || "nature")
  .split(",").map((s) => s.trim()).filter(Boolean);

const headers = { "Accept-Version": "v1", Authorization: `Client-ID ${key}` };
let results = [];

if (collection) {
  const res = await fetch(
    `https://api.unsplash.com/collections/${collection}/photos?per_page=30&orientation=landscape`,
    { headers }
  );
  if (!res.ok) throw new Error("Unsplash HTTP " + res.status);
  results = await res.json();
} else if (query) {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&orientation=landscape`,
    { headers }
  );
  if (!res.ok) throw new Error("Unsplash HTTP " + res.status);
  results = (await res.json()).results;
} else {
  const per = Math.max(10, Math.floor(30 / topics.length));
  for (const slug of topics) {
    const res = await fetch(
      `https://api.unsplash.com/topics/${slug}/photos?per_page=${per}&orientation=landscape`,
      { headers }
    );
    if (!res.ok) throw new Error(`Unsplash HTTP ${res.status} for "${slug}"`);
    results = results.concat(await res.json());
  }
}

if (!results.length) throw new Error("No photos in pool");

// Deterministic daily pick across the pool
const now = new Date();
const day = Math.floor(
  (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
    Date.UTC(now.getUTCFullYear(), 0, 1)) / 86400000
);
const photo = results[day % results.length];

writeFileSync("daily.json", JSON.stringify({
  date: now.toISOString().slice(0, 10),
  url: photo.urls.raw + "&w=1920&q=80&fm=jpg",
  author: photo.user.name,
  link: photo.links.html
}, null, 2) + "\n");
console.log("OK:", photo.links.html);
