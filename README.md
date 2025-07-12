# Jewel Backend (Cashfree Payment API)

This is a minimal Node.js (Express) backend for securely handling Cashfree payment gateway integration.

## Features
- `/api/payment` endpoint: Accepts order details, creates a Cashfree order, and returns the payment session ID.
- Uses environment variables for Cashfree credentials (see `.env.example`).
- Ready for deployment on Vercel or any Node.js host.

## Usage
1. Copy `.env.example` to `.env` and fill in your Cashfree credentials.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the server locally:
   ```sh
   npm run dev
   ```
4. Deploy to Vercel for production use.

## API
### POST `/api/payment`
**Body:**
```
{
  "order_amount": 1000,
  "customer_id": "cust_123",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "9999999999",
  "return_url": "https://your-frontend.vercel.app/payment/success"
}
```
**Response:**
- `{ success: true, data: { payment_session_id, ... } }` on success
- `{ success: false, message }` on error

## Deployment
- Deploy this folder as a separate project on Vercel.
- Set environment variables in the Vercel dashboard.
- Use the backend URL in your frontend for payment API calls.

---

**Note:** Never expose your Cashfree credentials in frontend code or logs.
