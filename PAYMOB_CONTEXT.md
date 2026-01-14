# Paymob Integration Context (Accept API)

**Base URL:** `https://accept.paymob.com/api`

## 1. Authentication
* **Goal:** Get an `auth_token` to make subsequent requests.
* **Endpoint:** `POST /auth/tokens`
* **Body:**
    ```json
    {
      "api_key": "YOUR_API_KEY_FROM_ENV"
    }
    ```
* **Response:** returns `{ "token": "..." }` (This is the `auth_token`).

## 2. Order Registration
* **Goal:** Create an order in Paymob system to track the transaction.
* **Endpoint:** `POST /ecommerce/orders`
* **Body:**
    ```json
    {
      "auth_token": "TOKEN_FROM_STEP_1",
      "delivery_needed": "false",
      "amount_cents": "10000", // (Example: 100 EGP)
      "currency": "EGP",
      "merchant_order_id": "UNIQUE_ORDER_ID_FROM_YOUR_DB",
      "items": [] // Optional
    }
    ```
* **Response:** returns `{ "id": 123456, ... }` (This is the `paymob_order_id`).

## 3. Payment Key Request
* **Goal:** Generate a key to open the payment iframe or wallet interface.
* **Endpoint:** `POST /acceptance/payment_keys`
* **Body:**
    ```json
    {
      "auth_token": "TOKEN_FROM_STEP_1",
      "amount_cents": "10000", 
      "expiration": 3600, 
      "order_id": "PAYMOB_ORDER_ID_FROM_STEP_2",
      "billing_data": {
        "email": "user@example.com", 
        "first_name": "John", 
        "last_name": "Doe", 
        "phone_number": "+201xxxxxxxxx", 
        "street": "NA", 
        "building": "NA", 
        "floor": "NA", 
        "apartment": "NA", 
        "city": "Cairo", 
        "country": "EG"
      }, 
      "currency": "EGP", 
      "integration_id": "INTEGRATION_ID_FROM_ENV" 
      // (Use Card Integration ID for Cards, Wallet Integration ID for Wallets)
    }
    ```
* **Response:** returns `{ "token": "..." }` (This is the `payment_token`).

## 4. Frontend Handling
* **For Cards (Iframe):**
    Redirect user to: 
    `https://accept.paymob.com/api/acceptance/iframes/{IFRAME_ID}?payment_token={PAYMENT_TOKEN}`
* **For Mobile Wallets:**
    Send `POST /acceptance/payments/pay` with body:
    ```json
    {
      "source": { "identifier": "010xxxxxxx", "subtype": "WALLET" },
      "payment_token": "PAYMENT_TOKEN"
    }
    ```
    Then redirect user to the `redirect_url` in the response.

## 5. Webhook Security (HMAC Calculation)
* **Goal:** Verify that the callback request actually came from Paymob.
* **Method:**
    1. Extract the `hmac` query param from the callback URL.
    2. Concatenate values of the following keys from the request body **in this exact order**:
       `amount_cents`, `created_at`, `currency`, `error_occured`, `has_parent_transaction`, `id`, `integration_id`, `is_3d_secure`, `is_auth`, `is_capture`, `is_refunded`, `is_standalone_payment`, `is_voided`, `order`, `owner`, `pending`, `source_data.pan`, `source_data.sub_type`, `source_data.type`, `success`.
    3. Hash the concatenated string using **HMAC-SHA512** with your `HMAC_SECRET`.
    4. Compare your calculated hash with the received `hmac`.