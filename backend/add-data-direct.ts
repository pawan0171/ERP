import { prisma } from './server/prismaClient';

async function addDataDirect() {
  console.log('🌱 Adding sample data directly via Prisma...\n');

  try {
    // You need to manually create a user first via the frontend or Supabase dashboard
    // Then get that user's ID and paste it here:
    
    const userId = 'PASTE_YOUR_USER_ID_HERE';  // ⚠️ Replace this!
    
    if (userId === 'PASTE_YOUR_USER_ID_HERE') {
      console.log('❌ You need to:');
      console.log('   1. Go to http://localhost:5173');
      console.log('   2. Register a new account');
      console.log('   3. Check Supabase Dashboard → Authentication → Users');
      console.log('   4. Copy the User ID (UUID)');
      console.log('   5. Paste it in add-data-direct.ts where it says PASTE_YOUR_USER_ID_HERE');
      console.log('   6. Run this script again\n');
      return;
    }

    // Verify profile exists
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      console.log('❌ Profile not found for user ID:', userId);
      console.log('   Make sure the user exists in Supabase Auth first!\n');
      return;
    }

    console.log(`✅ Found profile: ${profile.full_name} (${profile.role})\n`);

    // Add customers
    console.log('Adding customers...');
    await prisma.customer.createMany({
      data: [
        {
          user_id: userId,
          name: 'Rajesh Enterprises',
          mobile: '9876543210',
          email: 'rajesh@example.com',
          business_name: 'Rajesh Traders',
          customer_type: 'Wholesale',
          status: 'Active',
          address: '123 Market Street, Mumbai',
        },
        {
          user_id: userId,
          name: 'Priya Stores',
          mobile: '9988776655',
          email: 'priya@example.com',
          business_name: 'Priya General Store',
          customer_type: 'Retail',
          status: 'Active',
          address: '456 Main Road, Delhi',
        },
        {
          user_id: userId,
          name: 'Amit Distributors',
          mobile: '9123456789',
          email: 'amit@example.com',
          business_name: 'Amit Distribution Co.',
          customer_type: 'Distributor',
          status: 'Lead',
          address: '789 Industrial Area, Bangalore',
        },
      ],
    });
    console.log('✅ Added 3 customers\n');

    // Add products
    console.log('Adding products...');
    await prisma.product.createMany({
      data: [
        {
          user_id: userId,
          name: 'Premium Rice 25kg',
          sku: 'RICE-25-' + Date.now(),
          category: 'Grains',
          unit_price: 1500,
          stock_quantity: 100,
          min_stock_quantity: 20,
          location: 'Warehouse A',
        },
        {
          user_id: userId,
          name: 'Cooking Oil 5L',
          sku: 'OIL-5L-' + Date.now(),
          category: 'Oils',
          unit_price: 800,
          stock_quantity: 50,
          min_stock_quantity: 15,
          location: 'Warehouse A',
        },
        {
          user_id: userId,
          name: 'Sugar 50kg',
          sku: 'SUGAR-50-' + Date.now(),
          category: 'Grains',
          unit_price: 2500,
          stock_quantity: 5,
          min_stock_quantity: 10,
          location: 'Warehouse B',
        },
      ],
    });
    console.log('✅ Added 3 products\n');

    console.log('🎉 Sample data added successfully!');
    console.log('   Refresh your Supabase dashboard to see the data.\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addDataDirect();
