// Express backend for Cashfree Payment Gateway integration
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Backend running' });
});

// Cashfree payment endpoint
app.post('/api/payment', async (req, res) => {
  try {
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

    if (response.data && response.data.payment_session_id) {
      return res.json({ success: true, data: response.data });
    } else {
      return res.status(500).json({ success: false, message: 'No response data received from Cashfree.' });
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
