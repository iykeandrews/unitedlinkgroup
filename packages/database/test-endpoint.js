const axios = require('axios');

async function test() {
  try {
    console.log('Logging in...');
    try {
      const loginRes = await axios.post('http://localhost:3001/auth/login', {
        email: 'superadmin@unitedlinksecurity.com',
        password: 'admin123!'
      });
      const token = loginRes.data.access_token;
      console.log('Logged in. Token received.');

      // Fetch the user's business
      // Since we don't have a direct "get my business" endpoint handy without looking, 
      // let's assume we can get it from the user profile or just list businesses if admin.
      // For now, let's try to get businesses list since we are super admin.
      
      const businessesRes = await axios.get('http://localhost:3001/businesses', {
          headers: { Authorization: `Bearer ${token}` }
      });
      const businesses = businessesRes.data;
      if (businesses.length === 0) {
          console.error('No businesses found for this user.');
          return;
      }
      const businessId = businesses[0].id; // Use the first business

      console.log(`Fetching leave types for business: ${businessId}`);
      
      const res = await axios.get(`http://localhost:3001/leave/types/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Status:', res.status);
      console.log('Data:', JSON.stringify(res.data, null, 2));

    } catch (loginError) {
       console.error('Login/Fetch Error:', loginError.message);
       if (loginError.response) {
         console.error('Response Status:', loginError.response.status);
         console.error('Response Data:', loginError.response.data);
       }
       return;
    }
  } catch (error) {
    console.error('Global Error:', error.message);
  }
}

test();
