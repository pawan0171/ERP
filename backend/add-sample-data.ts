import { supabaseAdmin } from './server/supabaseAdmin';

async function addSampleData() {
  console.log('🌱 Adding sample data...\n');

  try {
    // Create a test user via Supabase Auth
    console.log('1. Creating test user in Supabase Auth...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@test.com',
      password: 'password123',
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists, fetching existing user...');
        
        // Get existing user
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === 'admin@test.com');
        
        if (!existingUser) {
          console.error('❌ Could not find existing user');
          return;
        }
        
        console.log(`✅ Using existing user: ${existingUser.id}\n`);
        
        // Use existing user ID
        await addDataForUser(existingUser.id);
      } else {
        console.error('❌ Error creating user:', authError.message);
        return;
      }
    } else {
      const userId = authData.user.id;
      console.log(`✅ User created: ${userId}\n`);
      
      // Create profile
      console.log('2. Creating profile...');
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          full_name: 'Admin User',
          role: 'admin',
        });

      if (profileError && !profileError.message.includes('duplicate')) {
        console.error('❌ Error creating profile:', profileError.message);
        return;
      }
      console.log('✅ Profile created\n');
      
      await addDataForUser(userId);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

async function addDataForUser(userId: string) {
  // Add customers
  console.log('3. Adding sample customers...');
  const { data: customers, error: custError } = await supabaseAdmin
    .from('customers')
    .insert([
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
    ])
    .select();

  if (custError) {
    console.error('❌ Error adding customers:', custError.message);
  } else {
    console.log(`✅ Added ${customers?.length || 0} customers\n`);
  }

  // Add products
  console.log('4. Adding sample products...');
  const { data: products, error: prodError } = await supabaseAdmin
    .from('products')
    .insert([
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
    ])
    .select();

  if (prodError) {
    console.error('❌ Error adding products:', prodError.message);
  } else {
    console.log(`✅ Added ${products?.length || 0} products\n`);
  }

  console.log('🎉 Sample data added successfully!\n');
  console.log('📝 Login credentials:');
  console.log('   URL: http://localhost:5173');
  console.log('   Email: admin@test.com');
  console.log('   Password: password123\n');
}

addSampleData();
