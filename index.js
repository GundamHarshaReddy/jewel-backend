// Express backend for Cashfree Payment Gateway integration
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://luxeandlush.vercel.app', 'http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'Backend running',
    timestamp: new Date().toISOString(),
    environment: process.env.CASHFREE_ENVIRONMENT || 'production',
    hasCredentials: !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY)
  });
});

// Additional health check for Vercel
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'Cashfree Payment Backend',
    timestamp: new Date().toISOString()
  });
});

// Cashfree payment endpoint
app.post('/api/payment', async (req, res) => {
  try {
    // Check if environment variables are set
    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: 'Cashfree credentials not configured' 
      });
    }

    const { order_amount, customer_id, customer_name, customer_email, customer_phone, return_url } = req.body;
    if (!order_amount || !customer_id || !customer_phone) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const order_id = `ORDER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const requestBody = {
      order_id,
      order_amount,
      order_currency: 'INR',
      customer_details: {
        customer_id,
        customer_name: customer_name || 'Customer',
        customer_email: customer_email || 'test@example.com',
        customer_phone
      },
      order_meta: {
        return_url: return_url || 'https://luxeandlush.vercel.app/payment/success?order_id=' + order_id
      },
      order_note: 'Luxe & Lush Jewelry Purchase',
      order_tags: {
        source: 'website',
        platform: 'web'
      }
    };


    // Determine Cashfree environment
    const cashfreeEnv = process.env.CASHFREE_ENVIRONMENT || 'production';
    const cashfreeApiUrl = cashfreeEnv === 'sandbox'
      ? 'https://sandbox.cashfree.com/pg/orders'
      : 'https://api.cashfree.com/pg/orders';

    // Log request details for debugging
    console.log('Making request to Cashfree:');
    console.log('URL:', cashfreeApiUrl);
    console.log('Environment:', cashfreeEnv);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': process.env.CASHFREE_APP_ID,
      'x-client-secret': process.env.CASHFREE_SECRET_KEY ? '[HIDDEN]' : 'MISSING'
    });

    const response = await axios.post(
      cashfreeApiUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY
        }
      }
    );

    // Log the full response for debugging
    console.log('Cashfree API Response:', JSON.stringify(response.data, null, 2));
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (response.data && response.data.payment_session_id) {
      const successResponse = { success: true, data: response.data };
      console.log('Sending success response to frontend:', JSON.stringify(successResponse, null, 2));
      return res.json(successResponse);
    } else {
      console.error('Missing payment_session_id in Cashfree response:', response.data);
      const errorResponse = { 
        success: false, 
        message: 'No payment_session_id received from Cashfree.',
        cashfreeResponse: response.data 
      };
      console.log('Sending error response to frontend:', JSON.stringify(errorResponse, null, 2));
      return res.status(500).json(errorResponse);
    }
  } catch (error) {
    // Log full error for debugging
    console.error('Error in /api/payment:', error, error?.response?.data);
    return res.status(500).json({
      success: false,
      message: error?.response?.data?.message || error.message || 'Error processing the request.'
    });
  }
});

// Order status verification endpoint
app.post('/api/order-status', async (req, res) => {
  try {
    // Support both naming conventions for environment variables
    const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.VITE_CASHFREE_APP_ID;
    const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || process.env.VITE_CASHFREE_SECRET_KEY;
    const CASHFREE_ENVIRONMENT = process.env.CASHFREE_ENVIRONMENT || process.env.VITE_CASHFREE_ENVIRONMENT || 'production';

    // Check if environment variables are set
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Cashfree credentials not configured',
        message: 'Cashfree credentials not configured' 
      });
    }

    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing order_id',
        message: 'Missing order_id' 
      });
    }

    // Determine API base URL
    const baseUrl = CASHFREE_ENVIRONMENT === 'production' 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg';

    const cashfreeApiUrl = `${baseUrl}/orders/${order_id}`;

    console.log(`Fetching order status for order: ${order_id}`);
    console.log('URL:', cashfreeApiUrl);
    console.log('Environment:', CASHFREE_ENVIRONMENT);

    const response = await axios.get(
      cashfreeApiUrl,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY
        }
      }
    );

    console.log('Cashfree order status response:', JSON.stringify(response.data, null, 2));

    if (response.data) {
      const successResponse = { success: true, data: response.data };
      console.log('Sending order status response to frontend:', JSON.stringify(successResponse, null, 2));
      return res.json(successResponse);
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'No data received from Cashfree for order status',
        message: 'No data received from Cashfree for order status' 
      });
    }
  } catch (error) {
    console.error('Error fetching order status:', error);
    console.error('Error details:', error?.response?.data);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch order status',
      message: error?.response?.data?.message || error.message || 'Error checking order status'
    });
  }
});

// Payment verification endpoint
app.post('/api/payment-status', async (req, res) => {
  try {
    // Check if environment variables are set
    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: 'Cashfree credentials not configured' 
      });
    }

    const { order_id, payment_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Missing order_id' });
    }

    // Determine Cashfree environment
    const cashfreeEnv = process.env.CASHFREE_ENVIRONMENT || 'production';
    
    // If payment_id is provided, get payment details, otherwise get order details
    let cashfreeApiUrl;
    if (payment_id) {
      cashfreeApiUrl = cashfreeEnv === 'sandbox'
        ? `https://sandbox.cashfree.com/pg/orders/${order_id}/payments/${payment_id}`
        : `https://api.cashfree.com/pg/orders/${order_id}/payments/${payment_id}`;
    } else {
      cashfreeApiUrl = cashfreeEnv === 'sandbox'
        ? `https://sandbox.cashfree.com/pg/orders/${order_id}/payments`
        : `https://api.cashfree.com/pg/orders/${order_id}/payments`;
    }

    console.log('Checking payment status for order:', order_id, 'payment:', payment_id);
    console.log('URL:', cashfreeApiUrl);

    const response = await axios.get(
      cashfreeApiUrl,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY
        }
      }
    );

    console.log('Payment status response:', JSON.stringify(response.data, null, 2));

    if (response.data) {
      const successResponse = { success: true, data: response.data };
      console.log('Sending payment status response to frontend:', JSON.stringify(successResponse, null, 2));
      return res.json(successResponse);
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'No data received from Cashfree for payment status' 
      });
    }
  } catch (error) {
    console.error('Error in /api/payment-status:', error, error?.response?.data);
    return res.status(500).json({
      success: false,
      message: error?.response?.data?.message || error.message || 'Error checking payment status'
    });
  }
});

// Webhook endpoint for Cashfree payment notifications
app.post('/api/webhook', async (req, res) => {
  try {
    console.log('Webhook received:', req.body);
    
    const { order_id, order_status, order_amount, payment_id, payment_status } = req.body;
    
    // Verify the webhook signature (optional but recommended)
    // You can add signature verification here for security
    
    // Process the payment status
    if (payment_status === 'SUCCESS') {
      console.log(`Payment successful for order ${order_id}, payment ID: ${payment_id}`);
      // Here you can:
      // 1. Update your database
      // 2. Send confirmation emails
      // 3. Update inventory
      // 4. Any other business logic
    } else if (payment_status === 'FAILED') {
      console.log(`Payment failed for order ${order_id}`);
      // Handle failed payment
    } else {
      console.log(`Payment status ${payment_status} for order ${order_id}`);
    }
    
    // Always respond with 200 OK to acknowledge receipt
    res.status(200).json({ success: true, message: 'Webhook processed' });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
