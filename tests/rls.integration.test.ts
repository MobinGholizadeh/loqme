import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withDatabaseActor, withDatabaseService } from '@/lib/db/context';
import { createRlsClient } from '@/lib/db/rls-client';
import { createSessionToken } from '@/lib/auth/session';
import { withDatabaseRequest } from '@/lib/db/request';
import { reservationService } from '@/domain/reservation/reservation.service';
import { orderService } from '@/domain/order/order.service';
import { merchantService } from '@/domain/merchant/merchant.service';
import { pickupService } from '@/domain/pickup/pickup.service';
import { moderationService } from '@/domain/moderation/moderation.service';
import { authService } from '@/domain/auth/auth.service';
import { ConsoleMockNotificationService } from '@/lib/notifications/console-mock';
import { submitApplication, reviewApplication } from '@/domain/business/application.service';
import { getMerchantDataReport } from '@/domain/merchant/merchant-report.service';
import { GET as orderRoute } from '@/app/api/orders/[id]/route';
import { GET as reconciliationRoute } from '@/app/api/admin/reconciliation/route';

/** Real PostgreSQL, real policies, real restricted login. No Prisma/auth mocks. */
describe('PostgreSQL RLS acceptance', () => {
  const run = randomUUID();
  const adminUrl = process.env.DATABASE_MIGRATION_URL;
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: adminUrl }) });
  const as = <T>(user: string | undefined, fn: () => T) => withDatabaseActor(user, fn);
  let admin: string, owner: string, otherOwner: string, manager: string, cashier: string, noScan: string;
  let user: string, otherUser: string, customer: string, otherCustomer: string;
  let merchant: string, otherMerchant: string, category: string, city: string, location: string;
  let ownOrder: string, foreignOrder: string, publicListing: string, privateListing: string;

  beforeAll(async () => {
    for (const url of [adminUrl, process.env.DATABASE_URL]) {
      if (!url || !new URL(url).pathname.startsWith('/loqme_onboarding_test_')) throw new Error('Explicit disposable admin and runtime database URLs required');
    }
    if (new URL(adminUrl!).pathname !== new URL(process.env.DATABASE_URL!).pathname) throw new Error('Test connections must target the same database');
    async function account(name: string, role: 'ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_STAFF' | 'CUSTOMER') {
      return db.user.create({ data: { mobile: `rls-${name}-${run}`, role, customer: { create: { fullName: name } } }, include: { customer: true } });
    }
    admin=(await account('admin','ADMIN')).id;
    owner=(await account('owner','MERCHANT_OWNER')).id;
    otherOwner=(await account('other-owner','MERCHANT_OWNER')).id;
    manager=(await account('manager','MERCHANT_STAFF')).id;
    cashier=(await account('cashier','MERCHANT_STAFF')).id;
    noScan=(await account('no-scan','MERCHANT_STAFF')).id;
    const a=await account('buyer','CUSTOMER'), b=await account('other-buyer','CUSTOMER');
    user=a.id; customer=a.customer!.id; otherUser=b.id; otherCustomer=b.customer!.id;
    merchant=(await db.merchant.create({ data: { ownerUserId: owner, businessNameFa: 'فروشگاه آزمون', verificationStatus:'APPROVED', staff: { create: [
      { userId: manager, role:'MANAGER' }, { userId:cashier, role:'CASHIER' }, { userId:noScan, role:'CASHIER',canScanPickup:false },
    ] } } })).id;
    otherMerchant=(await db.merchant.create({ data:{ownerUserId:otherOwner,businessNameFa:'فروشگاه دیگر',verificationStatus:'APPROVED'} })).id;
    const province=await db.province.create({data:{nameFa:'آزمون',slug:`rls-${run}`}});
    city=(await db.city.create({data:{provinceId:province.id,nameFa:'آزمون',slug:`rls-${run}`}})).id;
    category=(await db.category.create({data:{nameFa:'آزمون',slug:`rls-${run}`}})).id;
    location=(await db.merchantLocation.create({data:{merchantId:merchant,cityId:city,addressFa:'آدرس آزمون',latitude:37.55,longitude:45.07}})).id;
    publicListing=(await listing()).id;
    privateListing=(await listing('DRAFT')).id;
    const foreignListing=await listing('PUBLISHED',otherMerchant);
    ownOrder=(await db.order.create({data:{orderNumber:`RLS-A-${run}`,customerId:customer,merchantId:merchant,totalAmountToman:100,status:'READY_FOR_PICKUP',
      items:{create:{listingId:publicListing,unitPriceToman:100,quantity:1,subtotalToman:100}},pickupVerification:{create:{otpCode:'1234'}}}})).id;
    foreignOrder=(await db.order.create({data:{orderNumber:`RLS-B-${run}`,customerId:otherCustomer,merchantId:otherMerchant,totalAmountToman:100,status:'READY_FOR_PICKUP',
      items:{create:{listingId:foreignListing.id,unitPriceToman:100,quantity:1,subtotalToman:100}},pickupVerification:{create:{otpCode:'5678'}}}})).id;
    for(const oid of [ownOrder,foreignOrder]) await db.financialTransaction.create({data:{orderId:oid,type:'CUSTOMER_PAYMENT',debitAccount:'CUSTOMER_PAYMENT',creditAccount:'PLATFORM_CLEARING',amountToman:100}});
  },30000);
  afterAll(async()=>{await db.$disconnect();await prisma.$disconnect();});

  async function listing(status: 'PUBLISHED'|'DRAFT'='PUBLISHED', mid=merchant) {
    return db.listing.create({data:{merchantId:mid,merchantLocationId:mid===merchant?location:undefined,categoryId:category,titleFa:'بسته آزمون',
      originalPriceToman:200,discountedPriceToman:100,status,pickupDate:new Date(),pickupStart:new Date(Date.now()-60000),pickupEnd:new Date(Date.now()+3600000),
      inventory:{create:{totalQuantity:20}},safety:{create:{safetyStatus:'APPROVED',allergens:[],dietaryTags:[]}}}});
  }
  async function checkout() {
    const l=await listing();
    const hold=await as(user,()=>reservationService.createReservation({customerId:customer,listingId:l.id}));
    expect(hold.success).toBe(true);
    const order=await as(user,()=>orderService.createOrderFromReservation({customerId:customer,reservationId:hold.reservation!.id,gateway:'MOCK',callbackUrl:'http://localhost/callback'}));
    expect(order.success).toBe(true);
    return { l, hold, order };
  }

  it('enables and forces RLS on every model, with a non-owner runtime login',async()=>{
    const tables=await db.$queryRaw<{relname:string;relrowsecurity:boolean;relforcerowsecurity:boolean}[]>`SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname NOT IN ('_prisma_migrations','spatial_ref_sys')`;
    expect(tables).toHaveLength(43);expect(tables.every(t=>t.relrowsecurity&&t.relforcerowsecurity)).toBe(true);
    const [role]=await prisma.$queryRaw<{current_user:string;rolsuper:boolean;rolbypassrls:boolean}[]>`SELECT current_user,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
    expect(role).toEqual({current_user:'loqme_app',rolsuper:false,rolbypassrls:false});
  });
  it('rejects elevated runtime connections instead of silently bypassing policies',async()=>{
    const unsafe=createRlsClient(db);await expect(unsafe.user.count()).rejects.toThrow('non-owner');
  });
  it('defaults to public catalog only and hides all personal and operational rows',async()=>{
    expect(await prisma.listing.findUnique({where:{id:publicListing}})).not.toBeNull();
    expect(await prisma.listing.findUnique({where:{id:privateListing}})).toBeNull();
    for(const model of ['user','customer','session','otpCode','order','orderItem','reservation','payment','merchantStaff','pickupVerification','financialTransaction','auditLog'] as const) {
      expect(await prisma[model].count()).toBe(0);
    }
    await expect(prisma.user.create({data:{mobile:`anonymous-${run}`}})).rejects.toThrow();
  });
  it('isolates customer reads, raw SQL, relations and writes without caller filters',async()=>{
    await as(user,async()=>{
      expect((await prisma.order.findMany()).map(o=>o.id)).toEqual([ownOrder]);
      expect(await prisma.order.findUnique({where:{id:foreignOrder}})).toBeNull();
      expect(await prisma.$queryRaw`SELECT id FROM "Order"`).toEqual([{id:ownOrder}]);
      expect(await prisma.customer.findUnique({where:{id:otherCustomer}})).toBeNull();
      expect(await prisma.order.updateMany({where:{id:foreignOrder},data:{notesFa:'forged'}})).toEqual({count:0});
      await expect(prisma.favorite.create({data:{customerId:otherCustomer,merchantId:merchant}})).rejects.toThrow();
      await expect(prisma.user.update({where:{id:user},data:{role:'ADMIN'}})).rejects.toThrow();
      await expect(prisma.customer.update({where:{id:customer},data:{userId:otherUser}})).rejects.toThrow();
      await expect(prisma.order.update({where:{id:ownOrder},data:{status:'COMPLETED'}})).rejects.toThrow();
    });
  });
  it('permits customer favorites only for their own customer record',async()=>{
    await as(user,async()=>{const f=await prisma.favorite.create({data:{customerId:customer,merchantId:merchant}});expect(await prisma.favorite.count()).toBe(1);await prisma.favorite.delete({where:{id:f.id}});});
  });
  it('grants managers listing edits only at their store and denies financial ledgers',async()=>{
    await as(manager,async()=>{
      expect(await prisma.listing.update({where:{id:privateListing},data:{titleFa:'تغییر مدیر'}})).toHaveProperty('titleFa','تغییر مدیر');
      expect(await prisma.financialTransaction.count()).toBe(0);
      const created=await prisma.listing.create({data:{merchantId:merchant,categoryId:category,titleFa:'پیش‌نویس مدیر',originalPriceToman:200,discountedPriceToman:100,
        pickupDate:new Date(),pickupStart:new Date(),pickupEnd:new Date(Date.now()+3600000),inventory:{create:{totalQuantity:5}},safety:{create:{allergens:[],dietaryTags:[]}}}});
      expect(created.status).toBe('DRAFT');
      const foreign=await db.listing.findFirstOrThrow({where:{merchantId:otherMerchant}});
      await expect(prisma.listing.update({where:{id:foreign.id},data:{titleFa:'forged'}})).rejects.toThrow();
      await expect(prisma.merchant.update({where:{id:merchant},data:{commissionPercent:0}})).rejects.toThrow();
    });
  });
  it('limits cashiers to their pickup scope, honoring canScanPickup',async()=>{
    expect((await as(cashier,()=>prisma.order.findMany())).map(o=>o.id)).toEqual([ownOrder]);
    expect(await as(noScan,()=>prisma.order.count())).toBe(0);
    expect(await as(cashier,()=>prisma.financialTransaction.count())).toBe(0);
    await expect(as(cashier,()=>prisma.listing.update({where:{id:privateListing},data:{titleFa:'forged'}}))).rejects.toThrow();
    expect(await as(cashier,()=>prisma.listingInventory.updateMany({where:{listingId:publicListing},data:{reservedQuantity:1}}))).toEqual({count:0});
  });
  it('allows owner finances only for their store and prevents ownership/approval changes',async()=>{
    await as(owner,async()=>{
      expect((await prisma.financialTransaction.findMany()).map(t=>t.orderId)).toEqual([ownOrder]);
      await expect(prisma.merchant.update({where:{id:merchant},data:{ownerUserId:otherOwner}})).rejects.toThrow();
      await expect(prisma.merchant.update({where:{id:merchant},data:{commissionPercent:0}})).rejects.toThrow();
      expect(await merchantService.getFinanceSummary(owner,merchant)).toBeDefined();
    });
  });
  it('uses current memberships, current roles and account status on every transaction',async()=>{
    await db.user.update({where:{id:owner},data:{isActive:false}});
    try{expect(await as(owner,()=>prisma.order.count())).toBe(0);}finally{await db.user.update({where:{id:owner},data:{isActive:true}});}
    await db.merchantStaff.update({where:{merchantId_userId:{merchantId:merchant,userId:cashier}},data:{canScanPickup:false}});
    try{expect(await as(cashier,()=>prisma.order.count())).toBe(0);}finally{await db.merchantStaff.update({where:{merchantId_userId:{merchantId:merchant,userId:cashier}},data:{canScanPickup:true}});}
    await db.user.update({where:{id:admin},data:{role:'CUSTOMER'}});
    try{expect(await as(admin,()=>prisma.order.count())).toBe(0);}finally{await db.user.update({where:{id:admin},data:{role:'ADMIN'}});}
  });
  it('allows live admin oversight but keeps audit and history append-only',async()=>{
    await as(admin,async()=>{
      expect(await prisma.order.count()).toBeGreaterThanOrEqual(2);
      const log=await prisma.auditLog.create({data:{action:'RLS_TEST',entityType:'Order',entityId:ownOrder,actorId:admin,actorRole:'ADMIN'}});
      await expect(prisma.auditLog.update({where:{id:log.id},data:{action:'tampered'}})).rejects.toThrow();
      expect(await prisma.auditLog.deleteMany({where:{id:log.id}})).toEqual({count:0});
    });
  });
  it('does not leak identity between concurrent requests or after rollback',async()=>{
    await Promise.all(Array.from({length:16},(_,i)=>as(i%2?user:otherUser,async()=>{
      expect((await prisma.order.findMany()).map(o=>o.id)).toEqual([i%2?ownOrder:foreignOrder]);
    })));
    await expect(as(user,()=>prisma.$transaction(async tx=>{expect(await tx.order.count()).toBe(1);throw Error('rollback-test');}))).rejects.toThrow('rollback-test');
    expect(await prisma.order.count()).toBe(0);
    const direct=new Client({connectionString:process.env.DATABASE_URL});await direct.connect();
    try{expect((await direct.query('SELECT id FROM "Order"')).rowCount).toBe(0);await expect(direct.query('TRUNCATE "Order" CASCADE')).rejects.toThrow();await expect(direct.query('SET ROLE loqme_rls_reader')).rejects.toThrow();}
    finally{await direct.end();}
  });
  it('binds verified cookie/bearer identities and ignores forged role/user headers',async()=>{
    const handler=withDatabaseRequest(async (_request:NextRequest)=>prisma.order.findMany());
    const token=await createSessionToken({userId:user,mobile:'09000000000',role:'ADMIN',fullName:null});
    for(const headers of [{authorization:`Bearer ${token}`},{cookie:`loqme_session=${token}`}]) {
      expect((await handler(new NextRequest('http://localhost/test',{headers}))).map(o=>o.id)).toEqual([ownOrder]);
    }
    expect(await handler(new NextRequest('http://localhost/test',{headers:{'x-user-id':admin,'x-role':'ADMIN',authorization:'Bearer fake'}}))).toEqual([]);
    const request=new NextRequest('http://localhost/api/orders/'+ownOrder,{headers:{authorization:`Bearer ${token}`}});
    expect((await orderRoute(request,{params:Promise.resolve({id:ownOrder})})).status).toBe(200);
    expect((await orderRoute(request,{params:Promise.resolve({id:foreignOrder})})).status).toBe(404);
    expect((await reconciliationRoute(request)).status).toBe(403);
    expect((await orderRoute(new NextRequest('http://localhost/api/orders/'+ownOrder),{params:Promise.resolve({id:ownOrder})})).status).toBe(401);
  });
  it('keeps authentication scoped to one phone and completes real OTP registration',async()=>{
    const mobile=`09${String(Date.now()).slice(-9)}`;
    const result=await authService.requestOtp(mobile,{mode:'register'});expect(result.success).toBe(true);
    const recent=ConsoleMockNotificationService.getRecentOtp(mobile);expect(recent).toBeDefined();
    const verified=await authService.verifyOtp(mobile,recent!.code);expect(verified.success).toBe(true);
    expect(await prisma.otpCode.count()).toBe(0);
    await withDatabaseService('auth',mobile,async()=>{
      expect(await prisma.user.count()).toBe(1);
      await expect(prisma.user.create({data:{mobile:`other-${run}`,role:'ADMIN'}})).rejects.toThrow();
    });
  });
  it('supports owner invitations and blocks cashier invitation/escalation',async()=>{
    const invited=await as(owner,()=>merchantService.addStaffMember(owner,{mobile:`rls-invite-${run}`,role:'MANAGER',fullName:'همکار'},merchant));
    expect(invited.role).toBe('MANAGER');
    expect(await as(invited.userId,()=>merchantService.resolveMerchantAndAuthorize(invited.userId,merchant))).toHaveProperty('role','MANAGER');
    await expect(as(cashier,()=>merchantService.addStaffMember(cashier,{mobile:`rls-deny-${run}`,role:'MANAGER'},merchant))).rejects.toThrow();
    await expect(as(owner,()=>prisma.merchantStaff.create({data:{merchantId:merchant,userId:otherUser,role:'OWNER'}}))).rejects.toThrow();
    await as(owner,()=>merchantService.removeStaffMember(owner,invited.id,merchant));
    expect(await as(invited.userId,()=>prisma.order.count())).toBe(0);
  });
  it('reserves concurrently, cancels, and expires other customers holds without exposing them',async()=>{
    const l=await listing();
    const holds=await Promise.all(Array.from({length:4},()=>as(user,()=>reservationService.createReservation({customerId:customer,listingId:l.id}))));
    expect(holds.every(h=>h.success)).toBe(true);expect(new Set(holds.map(h=>h.reservation!.id)).size).toBe(1);
    expect((await db.listingInventory.findUniqueOrThrow({where:{listingId:l.id}})).reservedQuantity).toBe(1);
    expect((await as(user,()=>reservationService.cancelReservation(holds[0].reservation!.id,customer))).success).toBe(true);
    const other=await as(otherUser,()=>reservationService.createReservation({customerId:otherCustomer,listingId:l.id}));expect(other.success).toBe(true);
    await db.reservation.update({where:{id:other.reservation!.id},data:{expiresAt:new Date(Date.now()-1000)}});
    expect(await as(user,()=>reservationService.sweepExpiredReservations(l.id))).toBe(1);
    expect((await db.listingInventory.findUniqueOrThrow({where:{listingId:l.id}})).reservedQuantity).toBe(0);
  });
  it('completes checkout and callback without a user cookie; scopes callbacks to one authority',async()=>{
    const {order}=await checkout();
    const result=await orderService.verifyAndCompleteOrder({authority:order.authority!});expect(result.success).toBe(true);
    expect(await orderService.verifyAndCompleteOrder({authority:order.authority!})).toHaveProperty('success',true);
    await withDatabaseService('payment',order.authority!,async()=>{
      expect((await prisma.order.findMany()).map(o=>o.id)).toEqual([order.order.id]);
      expect(await prisma.order.findUnique({where:{id:foreignOrder}})).toBeNull();
    });
    expect(await prisma.order.count()).toBe(0);
    expect(await db.financialTransaction.count({where:{orderId:order.order.id}})).toBe(3);
    await expect(as(user,()=>prisma.payment.updateMany({where:{orderId:order.order.id},data:{status:'SUCCESS'}}))).resolves.toEqual({count:0});
  });
  it('performs pickup, verified reviews, public review projection and merchant replies',async()=>{
    const {order}=await checkout();expect((await orderService.verifyAndCompleteOrder({authority:order.authority!})).success).toBe(true);
    const pass=await db.pickupVerification.findUniqueOrThrow({where:{orderId:order.order.id}});
    const pickup=await as(cashier,()=>pickupService.verifyPickup({merchantUserId:cashier,orderId:order.order.id,otpCode:pass.otpCode}));
    expect(pickup.response.success).toBe(true);
    const review=await as(user,()=>moderationService.submitReview(customer,order.order.id,{overallRating:5,commentFa:'عالی'}));
    const publicReviews=await moderationService.listMerchantReviews(merchant);
    expect(publicReviews.items.find(r=>r.id===review.id)?.customer.fullName).toBe('buyer');
    expect(await prisma.customer.count()).toBe(0);expect(await prisma.order.count()).toBe(0);
    await as(owner,()=>moderationService.replyToReview(owner,review.id,'ممنون'));
    await expect(as(owner,()=>prisma.review.update({where:{id:review.id},data:{overallRating:1}}))).rejects.toThrow();
  });
  it('preserves safety aggregation across customers and only an admin can lift a restriction',async()=>{
    const first=await as(user,()=>moderationService.submitComplaint(customer,ownOrder,{category:'EXPIRED_FOOD',descriptionFa:'گزارش ایمنی برای آزمون',evidencePhotos:[]}));
    const secondOrder=await db.order.create({data:{orderNumber:`RLS-SAFETY-${run}`,customerId:otherCustomer,merchantId:merchant,totalAmountToman:100,status:'COMPLETED',
      items:{create:{listingId:publicListing,unitPriceToman:100,quantity:1,subtotalToman:100}}}});
    await as(otherUser,()=>moderationService.submitComplaint(otherCustomer,secondOrder.id,{category:'SPOILED_FOOD',descriptionFa:'گزارش دوم ایمنی برای آزمون',evidencePhotos:[]}));
    expect((await db.listing.findUniqueOrThrow({where:{id:publicListing}})).status).toBe('PAUSED');
    expect((await db.listingSafety.findUniqueOrThrow({where:{listingId:publicListing}})).safetyStatus).toBe('RESTRICTED');
    expect(await as(otherUser,()=>prisma.complaint.findUnique({where:{id:first.id}}))).toBeNull();
    await expect(as(owner,()=>prisma.listingSafety.update({where:{listingId:publicListing},data:{safetyStatus:'APPROVED'}}))).rejects.toThrow();
    await as(admin,()=>prisma.listingSafety.update({where:{listingId:publicListing},data:{safetyStatus:'APPROVED'}}));
  });
  it('supports owner reports without exposing another store or granting cashier financial access',async()=>{
    const report=await as(owner,()=>getMerchantDataReport(owner,merchant,location));
    expect(report.merchantId).toBe(merchant);
    await expect(as(cashier,()=>getMerchantDataReport(cashier,merchant))).rejects.toThrow();
    await expect(as(owner,()=>getMerchantDataReport(owner,otherMerchant))).rejects.toThrow();
  });
  it('keeps application approval admin-only and permits onboarding',async()=>{
    const applicant=await db.user.create({data:{mobile:`applicant-${run}`}});
    const input={ownerName:'مالک آزمون',businessNameFa:'فروشگاه جدید',businessType:'BAKERY' as const,cityId:city,addressFa:'آدرس کامل برای آزمون فروشگاه',latitude:37.55,longitude:45.07,
      hours:Array.from({length:7},(_,dayOfWeek)=>({dayOfWeek,isOpen:true,storeOpenTime:'09:00',storeCloseTime:'20:00'}))};
    const application=await as(applicant.id,()=>submitApplication(applicant.id,input));
    await expect(as(applicant.id,()=>prisma.merchantApplication.update({where:{id:application.id},data:{status:'APPROVED'}}))).rejects.toThrow();
    expect(await as(otherUser,()=>prisma.merchantApplication.findUnique({where:{id:application.id}}))).toBeNull();
    expect(await as(admin,()=>prisma.merchantApplication.findUnique({where:{id:application.id}}))).not.toBeNull();
    await as(admin,()=>reviewApplication(admin,application.id,{decision:'APPROVED',expectedRevision:application.revision,reasonFa:'تایید برای آزمون پذیرش'}));
    expect((await db.user.findUniqueOrThrow({where:{id:applicant.id}})).role).toBe('MERCHANT_OWNER');
  });
});
