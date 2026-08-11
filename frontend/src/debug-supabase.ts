// Diagnostic script to test Supabase connection and permissions
import { supabase } from './lib/supabase';

export async function debugSupabase() {
  console.log('=== SUPABASE DIAGNOSTICS ===');
  
  // 1. Check authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('1. Session check:', {
    authenticated: !!session,
    user: session?.user?.email,
    error: sessionError
  });
  
  if (!session) {
    console.error('❌ NOT AUTHENTICATED - User must be logged in to insert data!');
    return;
  }
  
  // 2. Check user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  
  console.log('2. User profile:', {
    profile,
    error: profileError
  });
  
  // 3. Test customer insert
  console.log('3. Testing customer insert...');
  const testCustomer = {
    name: 'Test Customer',
    mobile: '9999999999',
    email: 'test@example.com',
    business_name: 'Test Business',
    gst_number: '',
    customer_type: 'Retail',
    address: 'Test Address',
    status: 'Lead',
    follow_up_date: null,
    notes: 'Test customer created by diagnostic script'
  };
  
  const insertResult = await supabase
    .from('customers')
    .insert(testCustomer)
    .select();
  
  console.log('Insert result:', {
    success: !insertResult.error,
    data: insertResult.data,
    error: insertResult.error
  });
  
  if (insertResult.error) {
    console.error('❌ INSERT FAILED:', insertResult.error.message);
    console.error('Error details:', insertResult.error);
    
    // Check if it's an RLS policy issue
    if (insertResult.error.message.includes('policy') || 
        insertResult.error.message.includes('permission') ||
        insertResult.error.code === '42501') {
      console.error('🔒 This appears to be a Row Level Security (RLS) policy issue!');
      console.error('Check your Supabase dashboard for RLS policies on the customers table.');
    }
  } else {
    console.log('✅ INSERT SUCCESSFUL!');
    
    // Clean up test data
    if (insertResult.data && insertResult.data[0]) {
      await supabase.from('customers').delete().eq('id', insertResult.data[0].id);
      console.log('Test customer deleted');
    }
  }
  
  // 4. Test read permissions
  console.log('4. Testing read permissions...');
  const { data: customers, error: readError } = await supabase
    .from('customers')
    .select('*')
    .limit(5);
  
  console.log('Read result:', {
    success: !readError,
    count: customers?.length || 0,
    error: readError
  });
  
  console.log('=== END DIAGNOSTICS ===');
}
