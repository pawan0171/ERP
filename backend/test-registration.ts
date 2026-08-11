/**
 * Test script to verify registration flow and data creation
 */

async function testRegistration() {
  console.log('🧪 Testing registration flow...\n');

  const API_URL = 'http://localhost:4001/api';

  try {
    // Step 1: Register a new user
    console.log('1. Registering new user...');
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        full_name: 'Test User',
        role: 'admin',
      }),
    });

    const registerData = await registerResponse.json();
    
    if (!registerResponse.ok) {
      console.error('❌ Registration failed:', registerData);
      return;
    }

    console.log('✅ User registered:', registerData.user.email);
    const userId = registerData.user.id;
    console.log(`   User ID: ${userId}\n`);

    // Step 2: Login
    console.log('2. Logging in...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registerData.user.email,
        password: 'password123',
      }),
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData);
      return;
    }

    console.log('✅ Logged in successfully');
    const token = loginData.access_token;
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Step 3: Create a customer
    console.log('3. Creating a customer...');
    const customerResponse = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test Customer',
        mobile: '9876543210',
        email: 'customer@example.com',
        business_name: 'Test Business',
        customer_type: 'Wholesale',
        status: 'Active',
        address: '123 Test Street',
      }),
    });

    const customerData = await customerResponse.json();
    
    if (!customerResponse.ok) {
      console.error('❌ Customer creation failed:', customerData);
      return;
    }

    console.log('✅ Customer created:', customerData.customer.name);
    console.log(`   Customer ID: ${customerData.customer.id}\n`);

    // Step 4: Get customers list
    console.log('4. Fetching customers...');
    const listResponse = await fetch(`${API_URL}/customers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const listData = await listResponse.json();
    
    if (!listResponse.ok) {
      console.error('❌ Fetch failed:', listData);
      return;
    }

    console.log('✅ Customers in database:');
    console.log(`   Total: ${listData.pagination.total}`);
    console.log(`   Results: ${listData.data.length}`);
    
    if (listData.data.length > 0) {
      listData.data.forEach((c: any) => {
        console.log(`   - ${c.name} (${c.status})`);
      });
    }

    console.log('\n🎉 All tests passed!');
    console.log('\n📝 Login with these credentials:');
    console.log(`   Email: ${registerData.user.email}`);
    console.log(`   Password: password123`);
    console.log(`   URL: http://localhost:5173\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testRegistration();
