import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

async function main() {
  assert(
    new URL(process.env.DATABASE_URL || "").pathname.startsWith(
      "/loqme_account_test_",
    ),
    "Disposable account test DB required",
  );
  const base = process.env.LOQME_TEST_URL;
  assert.equal(base, "http://localhost:3004");
  const secret =
    process.env.SESSION_SECRET ||
    parseEnv(readFileSync("apps/web/.env", "utf8")).SESSION_SECRET;
  assert(secret);
  const prisma = new PrismaClient();
  const token = (user: { id: string; mobile: string; role: string }) =>
    new SignJWT({ userId: user.id, mobile: user.mobile, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("10m")
      .sign(new TextEncoder().encode(secret));
  try {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { mobile: "09123333333" },
    });
    const store = await prisma.merchant.findFirstOrThrow({
      where: {
        owner: {
          role: "MERCHANT_OWNER",
          ownedStores: { none: { businessNameFa: "__never__" } },
        },
      },
      include: { owner: true },
      orderBy: { createdAt: "desc" },
    });
    const headers = {
      Authorization: `Bearer ${await token(admin)}`,
      "Content-Type": "application/json",
    };
    const oldHeaders = { Authorization: `Bearer ${await token(store.owner)}` };
    const endpoint = `${base}/api/admin/merchants/${store.id}/account`;
    const result = await (await fetch(endpoint, { headers })).json();
    assert.equal(
      result.data.owner.id,
      store.owner.id,
      "Server DB must match before any writes",
    );
    assert.equal(
      result.data.totalOrders,
      await prisma.order.count({ where: { merchantId: store.id } }),
    );
    assert.equal((await fetch(endpoint, { headers: oldHeaders })).status, 403);
    const patch = async (body: unknown) => {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 200, await response.clone().text());
    };
    const update = {
      action: "UPDATE_ACCOUNT",
      expectedOwnerId: store.owner.id,
      fullName: "مالک آزمایشی حساب",
      reasonFa: "آزمایش در پایگاه جداگانه",
    };
    await patch({ ...update, isActive: false });
    assert.equal(
      (
        await (
          await fetch(`${base}/api/auth/session`, { headers: oldHeaders })
        ).json()
      ).authenticated,
      false,
    );
    assert.equal(
      (
        await fetch(`${base}/api/merchant/settings?merchantId=${store.id}`, {
          headers: oldHeaders,
        })
      ).status,
      403,
    );
    await patch({ ...update, isActive: true });
    await patch({
      action: "ASSIGN_OWNER",
      expectedOwnerId: store.owner.id,
      mobile: "09129999970",
      fullName: "مالک مستقل آزمایشی",
      reasonFa: "تست انتقال مالکیت",
    });
    const newOwner = await prisma.user.findUniqueOrThrow({
      where: { mobile: "09129999970" },
    });
    assert.equal(
      (await prisma.merchant.findUniqueOrThrow({ where: { id: store.id } }))
        .ownerUserId,
      newOwner.id,
    );
    assert.equal(
      await prisma.merchantStaff.count({
        where: { merchantId: store.id, userId: store.owner.id },
      }),
      0,
    );
    assert.equal(
      (
        await fetch(`${base}/api/merchant/settings?merchantId=${store.id}`, {
          headers: oldHeaders,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/api/merchant/settings?merchantId=${store.id}`, {
          headers: { Authorization: `Bearer ${await token(newOwner)}` },
        })
      ).status,
      200,
    );
    assert.equal(
      await prisma.auditLog.count({
        where: {
          entityId: store.id,
          action: { startsWith: "ADMIN_MERCHANT_" },
        },
      }),
      3,
    );
    console.log(
      "PASS: scoped admin account/orders; merchant denied admin endpoint; disable reflected in session and API; ownership transferred; old membership revoked; new owner authorized; three atomic audit records.",
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
