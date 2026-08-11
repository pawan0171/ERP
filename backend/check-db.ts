import { prisma } from './server/prismaClient';

async function checkDatabase() {
  console.log('🔍 Checking database connection...\n');

  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected successfully\n');

    // Check tables
    console.log('📊 Checking tables...\n');

    const profileCount = await prisma.profile.count();
    console.log(`- Profiles: ${profileCount} records`);

    const customerCount = await prisma.customer.count();
    console.log(`- Customers: ${customerCount} records`);

    const productCount = await prisma.product.count();
    console.log(`- Products: ${productCount} records`);

    const challanCount = await prisma.challan.count();
    console.log(`- Challans: ${challanCount} records`);

    const itemCount = await prisma.challanItem.count();
    console.log(`- Challan Items: ${itemCount} records`);

    const movementCount = await prisma.stockMovement.count();
    console.log(`- Stock Movements: ${movementCount} records`);

    // List all profiles
    if (profileCount > 0) {
      console.log('\n👤 Profiles in database:');
      const profiles = await prisma.profile.findMany({
        select: {
          id: true,
          full_name: true,
          role: true,
          created_at: true,
        },
      });
      profiles.forEach((p) => {
        console.log(`  - ${p.full_name} (${p.role}) - ID: ${p.id.substring(0, 8)}...`);
      });
    }

    // List all customers
    if (customerCount > 0) {
      console.log('\n🏢 Customers in database:');
      const customers = await prisma.customer.findMany({
        take: 5,
        select: {
          name: true,
          email: true,
          status: true,
          created_at: true,
        },
      });
      customers.forEach((c) => {
        console.log(`  - ${c.name} (${c.status}) - ${c.email || 'No email'}`);
      });
    }

    console.log('\n✅ Database check complete!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
