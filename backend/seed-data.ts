import { prisma } from './server/prismaClient';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function seedData() {
  console.log('🌱 Seeding database...\n');

  try {
    // Create a test user via Supabase Auth
    console.log('Creating test user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@test.com',
      password: 'password123',
      email_confirm: true,
    });

    if (authError) {
      console.error('❌ Error creating user:', authError.message);
      return;
    }

    const userId = authData.user.id;
    console.log(`✅ User created: ${userId}\n`);

    // Create profile
    console.log('Creating profile...');
    await prisma.profile.create({
      data: {
        id: userId,
        full_name: 'Admin User',
        role: 'admin',
      },
    });
    console.log('✅ Profile created\n');

    // Create sample customers
    console.log('Creating sample customers...');
    const customers = await prisma.customer.createMany({
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
          business_name: 'Amit Distribution Co.',
          customer_type: 'Distributor',
          status: 'Lead',
          address: '789 Industrial Area, Bangalore',
        },
      ],
    });
    console.log(`✅ Created ${customers.count} customers\n`);

    // Create sample products
    console.log('Creating sample products...');
    const products = await prisma.product.createMany({
      data: [
        {
          user_id: userId,
          name: 'Premium Rice 25kg',
          sku: 'RICE-25',
          category: 'Grains',
          unit_price: 1500,
          stock_quantity: 100,
          min_stock_quantity: 20,
          location: 'Warehouse A',
        },
        {
          user_id: userId,
          name: 'Cooking Oil 5L',
          sku: 'OIL-5L',
          category: 'Oils',
          unit_price: 800,
          stock_quantity: 50,
          min_stock_quantity: 15,
          location: 'Warehouse A',
        },
        {
          user_id: userId,
          name: 'Sugar 50kg',
          sku: 'SUGAR-50',
          category: 'Grains',
          unit_price: 2500,
          stock_quantity: 5,
          min_stock_quantity: 10,
          location: 'Warehouse B',
        },
        {
          user_id: userId,
          name: 'Wheat Flour 10kg',
          sku: 'WHEAT-10',
          category: 'Flour',
          unit_price: 400,
          stock_quantity: 200,
          min_stock_quantity: 30,
          location: 'Warehouse A',
        },
      ],
    });
    console.log(`✅ Created ${products.count} products\n`);

    console.log('🎉 Database seeded successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@test.com');
    console.log('   Password: password123');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
