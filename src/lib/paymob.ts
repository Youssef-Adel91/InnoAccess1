import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { env } from './env';

const PAYMOB_BASE_URL = 'https://accept.paymob.com/api';

/**
 * Paymob API Client
 */
class PaymobClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: PAYMOB_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Step 1: Authenticate with Paymob API and get auth token
     * @returns {Promise<string>} Auth token
     */
    async getAuthToken(): Promise<string> {
        try {
            const response = await this.client.post('/auth/tokens', {
                api_key: env.PAYMOB_API_KEY,
            });

            if (!response.data?.token) {
                throw new Error('No token received from Paymob authentication');
            }

            return response.data.token;
        } catch (error) {
            console.error('Paymob authentication error:', error);
            throw new Error('Failed to authenticate with Paymob');
        }
    }

    /**
     * Step 2: Register an order with Paymob
     * @param authToken - Authentication token from step 1
     * @param amountCents - Amount in cents (e.g., 10000 = 100 EGP)
     * @param merchantOrderId - Unique order ID from your database
     * @returns {Promise<number>} Paymob order ID
     */
    async registerOrder(
        authToken: string,
        amountCents: number,
        merchantOrderId: string
    ): Promise<number> {
        try {
            const response = await this.client.post('/ecommerce/orders', {
                auth_token: authToken,
                delivery_needed: 'false',
                amount_cents: amountCents.toString(),
                currency: 'EGP',
                merchant_order_id: merchantOrderId,
                items: [],
            });

            if (!response.data?.id) {
                throw new Error('No order ID received from Paymob');
            }

            return response.data.id;
        } catch (error) {
            console.error('Paymob order registration error:', error);
            throw new Error('Failed to register order with Paymob');
        }
    }

    /**
     * Step 3: Get payment key for iframe or wallet
     * @param authToken - Authentication token
     * @param amountCents - Amount in cents
     * @param paymobOrderId - Order ID from step 2
     * @param billingData - User billing information
     * @param integrationId - Integration ID (card or wallet)
     * @returns {Promise<string>} Payment token
     */
    async getPaymentKey(
        authToken: string,
        amountCents: number,
        paymobOrderId: number,
        billingData: BillingData,
        integrationId: string
    ): Promise<string> {
        try {
            const response = await this.client.post('/acceptance/payment_keys', {
                auth_token: authToken,
                amount_cents: amountCents.toString(),
                expiration: 3600, // 1 hour
                order_id: paymobOrderId.toString(),
                billing_data: billingData,
                currency: 'EGP',
                integration_id: integrationId,
            });

            if (!response.data?.token) {
                throw new Error('No payment token received from Paymob');
            }

            return response.data.token;
        } catch (error) {
            console.error('Paymob payment key error:', error);
            throw new Error('Failed to get payment key from Paymob');
        }
    }

    /**
     * Verify HMAC signature from Paymob webhook
     * @param webhookData - Data received from webhook
     * @param receivedHmac - HMAC from query parameters
     * @returns {boolean} Whether the HMAC is valid
     */
    verifyHmac(webhookData: PaymobWebhookData, receivedHmac: string): boolean {
        try {
            // Fields used in HMAC calculation (in exact order)
            const hmacFields = [
                'amount_cents',
                'created_at',
                'currency',
                'error_occured',
                'has_parent_transaction',
                'id',
                'integration_id',
                'is_3d_secure',
                'is_auth',
                'is_capture',
                'is_refunded',
                'is_standalone_payment',
                'is_voided',
                'order',
                'owner',
                'pending',
                'source_data.pan',
                'source_data.sub_type',
                'source_data.type',
                'success',
            ];

            // Extract values in the correct order
            const values = hmacFields.map((field) => {
                const keys = field.split('.');
                let value: any = webhookData;

                for (const key of keys) {
                    value = value?.[key];
                }

                return value !== undefined && value !== null ? value.toString() : '';
            });

            // Concatenate all values
            const concatenatedString = values.join('');

            // Calculate HMAC using SHA512
            const calculatedHmac = crypto
                .createHmac('sha512', env.PAYMOB_HMAC_SECRET)
                .update(concatenatedString)
                .digest('hex');

            return calculatedHmac === receivedHmac;
        } catch (error) {
            console.error('HMAC verification error:', error);
            return false;
        }
    }
}

// Export singleton instance
export const paymobClient = new PaymobClient();

// Types
export interface BillingData {
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    city: string;
    country: string;
}

export interface PaymobWebhookData {
    amount_cents: number;
    created_at: string;
    currency: string;
    error_occured: boolean;
    has_parent_transaction: boolean;
    id: number;
    integration_id: number;
    is_3d_secure: boolean;
    is_auth: boolean;
    is_capture: boolean;
    is_refunded: boolean;
    is_standalone_payment: boolean;
    is_voided: boolean;
    order: any;
    owner: number;
    pending: boolean;
    source_data: {
        pan?: string;
        sub_type: string;
        type: string;
    };
    success: boolean;
    [key: string]: any;
}

/**
 * High-level payment flow functions
 */

/**
 * Initiate card payment flow
 * @param amountCents - Amount in cents
 * @param merchantOrderId - Your order ID
 * @param billingData - User billing data
 * @returns {Promise<string>} Payment iframe URL
 */
export async function initiateCardPayment(
    amountCents: number,
    merchantOrderId: string,
    billingData: BillingData
): Promise<string> {
    const authToken = await paymobClient.getAuthToken();
    const paymobOrderId = await paymobClient.registerOrder(authToken, amountCents, merchantOrderId);
    const paymentToken = await paymobClient.getPaymentKey(
        authToken,
        amountCents,
        paymobOrderId,
        billingData,
        env.PAYMOB_INTEGRATION_ID_CARD
    );

    return `${PAYMOB_BASE_URL}/acceptance/iframes/${env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;
}

/**
 * Initiate wallet payment flow
 * @param amountCents - Amount in cents
 * @param merchantOrderId - Your order ID
 * @param billingData - User billing data
 * @returns {Promise<string>} Payment token for wallet
 */
export async function initiateWalletPayment(
    amountCents: number,
    merchantOrderId: string,
    billingData: BillingData
): Promise<string> {
    const authToken = await paymobClient.getAuthToken();
    const paymobOrderId = await paymobClient.registerOrder(authToken, amountCents, merchantOrderId);
    const paymentToken = await paymobClient.getPaymentKey(
        authToken,
        amountCents,
        paymobOrderId,
        billingData,
        env.PAYMOB_INTEGRATION_ID_WALLET
    );

    return paymentToken;
}
