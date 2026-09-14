// Explicitly invoked live API smoke test, restricted to a disposable local database.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

async function main() {
  const database = new URL(process.env.DATABASE_URL || "");
  assert(database.pathname.startsWith("/loqme_feedback_test_"), "Disposable feedback DB required");
  const base = process.env.LOQME_TEST_URL;
  assert.equal(base, "http://localhost:3004");
  const env = parseEnv(readFileSync("apps/web/.env", "utf8"));
  const secret = process.env.SESSION_SECRET || env.SESSION_SECRET;
  assert(secret);
  const prisma = new PrismaClient();
  try {
    const tokens: Record<string, string> = {};
    const mobiles = { ADMIN: "09123333333", CUSTOMER: "09121111111", MERCHANT_OWNER: "09122222222" };
    for (const role of ["ADMIN", "CUSTOMER", "MERCHANT_OWNER"] as const) {
      const user = await prisma.user.findUniqueOrThrow({ where: { mobile: mobiles[role] } });
      tokens[role] = await new SignJWT({ userId: user.id, mobile: user.mobile, role }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(new TextEncoder().encode(secret));
      for (const route of ["listings", "pickup/queue", "finance", "staff", "settings"]) {
        const response = await fetch(`${base}/api/merchant/${route}`, { headers: { Authorization: `Bearer ${tokens[role]}` } });
        assert.equal(response.status, role === "MERCHANT_OWNER" ? 200 : 403, `${role}: ${route}`);
      }
    }
    const headers = { Authorization: `Bearer ${tokens.MERCHANT_OWNER}` };
    const owner = await prisma.user.findUniqueOrThrow({ where: { mobile: mobiles.MERCHANT_OWNER } });
    const merchant = await prisma.merchant.findFirstOrThrow({ where: { OR: [{ ownerUserId: owner.id }, { staff: { some: { userId: owner.id } } }] } });
    const settings = await (await fetch(`${base}/api/merchant/settings`, { headers })).json();
    assert.equal(settings.data.id, merchant.id, "Server must use the same disposable DB before writes");
    const image = readFileSync("apps/web/public/listing-defaults/bread.png");
    const response = await fetch(`${base}/api/merchant/listings/image`, { method: "POST", headers: { ...headers, "Content-Type": "image/png" }, body: image });
    assert.equal(response.status, 200);
    const { imageUrl } = await response.json();
    const photo = await fetch(base + imageUrl);
    assert.equal(photo.status, 200); assert.equal(photo.headers.get("content-type"), "image/webp");
    for (const [index, slug] of ["bakery", "cafe", "restaurant", "supermarket", "produce", "deli"].entries()) {
      const published = await fetch(`${base}/api/merchant/listings`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ categorySlug: slug, titleFa: `بسته آزمایشی ${slug}`, descriptionFa: "صرفاً داده آزمایشی در پایگاه جداگانه", quantity: 2, originalPriceToman: 100000, discountedPriceToman: 50000, temperatureRequirement: index === 0 ? "ROOM_TEMP" : "CHILLED", imageUrl: index === 0 ? imageUrl : "/listing-defaults/meal.png" }) });
      assert.equal(published.status, 200, await published.clone().text());
      const body = await published.json();
      const stored = await prisma.listing.findUniqueOrThrow({ where: { id: body.data.id }, include: { images: true, category: true, safety: true } });
      assert.equal(stored.images.length, 1); assert.equal(stored.category.slug, slug);
      assert.equal(stored.safety?.temperatureRequirement, index === 0 ? "ROOM_TEMP" : "CHILLED");
    }
    const feed = await (await fetch(`${base}/api/listings/nearby?scope=all&limit=50`)).json();
    assert(feed.success); assert(feed.data.length > 0);
    assert(feed.data.every((listing: { cityNameFa?: string }) => listing.cityNameFa));
    console.log("PASS: 15 real role/API checks; decoded upload served as WebP; six categories published with persisted images; all-region feed contains city labels. Disposable DB only.");
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
