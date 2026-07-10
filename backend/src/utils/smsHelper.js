import fs from 'fs';
import path from 'path';

// SMS Gateway configuration variables
const SMS_USER_ID = process.env.SMS_USER_ID || '2090';
const SMS_API_KEY = process.env.SMS_API_KEY || 'dce92771-1d95-43e1-adc9-816173bda37f';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'DilumBakery';

/**
 * Normalizes Sri Lankan phone numbers to international format (e.g., +94777498608)
 */
function normalizePhoneNumber(phone) {
    if (!phone) return null;
    let clean = phone.replace(/[^0-9+]/g, ''); // keep only numbers and +

    if (clean.startsWith('0')) {
        return `+94${clean.slice(1)}`;
    }
    if (clean.startsWith('94') && !clean.startsWith('+')) {
        return `+${clean}`;
    }
    if (clean.startsWith('7') && clean.length === 9) {
        return `+94${clean}`;
    }
    if (clean.startsWith('+')) {
        return clean;
    }
    return `+94${clean}`; // fallback
}

/**
 * Send receipt details to customer via SMSLenz API
 */
export const sendSalesSms = async (order, invoice) => {
    try {
        const rawPhone = order.customerSnapshot?.phone;
        const phone = normalizePhoneNumber(rawPhone);

        if (!phone) {
            console.log(`[SMS] No phone number available for customer: ${order.customerSnapshot?.name}`);
            return;
        }

        const itemsSummary = order.items.map(item => `${item.productName} (x${item.orderedQuantity})`).join(', ');
        const invoiceNum = invoice?.invoiceNumber || order.orderNumber;
        const total = order.grandTotal;

        // Custom SMS message text
        const message = `Dear ${order.customerSnapshot.name}, thank you for buying from Dilum Bake House! Bill No: ${invoiceNum}, Items: ${itemsSummary}. Total: LKR ${total.toFixed(2)}. paymentStatus: ${invoice?.paymentStatus || 'paid'}.`;

        console.log(`\n========================================`);
        console.log(`[SMS OUTBOX] Triggered send to: ${phone}`);
        console.log(`[SMS MESSAGE] "${message}"`);
        
        // Prepare request parameters for SMSLenz
        const params = new URLSearchParams({
            user_id: SMS_USER_ID,
            api_key: SMS_API_KEY,
            sender_id: SMS_SENDER_ID,
            contact: phone,
            message: message
        });

        // Send POST request with form URL-encoded body
        const res = await fetch('https://smslenz.lk/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const text = await res.text();
        console.log(`[SMS RESPONSE] Status: ${res.status} | Body: ${text}`);
        console.log(`========================================\n`);

        // Log to local file for record keeping
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logPath = path.join(logDir, 'sms_outbox.log');
        const logEntry = `[${new Date().toISOString()}] To: ${phone} | Status: ${res.status} | Msg: ${message} | Res: ${text}\n`;
        fs.appendFileSync(logPath, logEntry);

    } catch (err) {
        console.error('[SMS ERROR] Failed to send SMS via SMSLenz:', err);
    }
};

/**
 * Send a generic SMS message to a specific phone number via SMSLenz API
 */
export const sendGeneralSms = async (phone, message) => {
    try {
        const normalizedPhone = normalizePhoneNumber(phone);
        if (!normalizedPhone) {
            console.log(`[SMS] Invalid phone number provided: ${phone}`);
            return { success: false, error: 'Invalid phone number' };
        }

        const params = new URLSearchParams({
            user_id: SMS_USER_ID,
            api_key: SMS_API_KEY,
            sender_id: SMS_SENDER_ID,
            contact: normalizedPhone,
            message: message
        });

        const res = await fetch('https://smslenz.lk/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const text = await res.text();
        console.log(`[SMS RESPONSE] To: ${normalizedPhone} | Status: ${res.status} | Body: ${text}`);

        // Log to local file
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logPath = path.join(logDir, 'sms_outbox.log');
        const logEntry = `[${new Date().toISOString()}] (Bulk/Promo) To: ${normalizedPhone} | Status: ${res.status} | Msg: ${message} | Res: ${text}\n`;
        fs.appendFileSync(logPath, logEntry);

        return { success: res.status === 200, text };
    } catch (err) {
        console.error('[SMS ERROR] Failed to send generic SMS:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Send real-time bakery invoice notification details (morning, afternoon, balances) via SMSLenz API
 */
export const sendBakeryInvoiceSms = async (invoice, recipients) => {
    try {
        if (!recipients || recipients.length === 0) {
            console.log('[SMS] No recipients provided for bakery invoice SMS');
            return [];
        }

        // Calculate morning and afternoon totals
        let morningAmount = 0;
        let afternoonAmount = 0;
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach(item => {
                const price = Number(item.price || 0);
                morningAmount += Number(item.morningQty || 0) * price;
                afternoonAmount += Number(item.afternoonQty || 0) * price;
            });
        }

        const todayTotal = Number(invoice.deliveredTotal || 0);
        const oldBalance = Number(invoice.oldBalance || 0);
        const fullAmount = Number(invoice.grandTotal || 0);
        const todayPaidAmount = Number(invoice.amountReceived || 0);
        const newBalance = Number(invoice.newBalance || 0);

        const message = `Shop: ${invoice.shopName}\n` +
            `Morning: Rs. ${morningAmount.toFixed(2)}\n` +
            `Afternoon: Rs. ${afternoonAmount.toFixed(2)}\n` +
            `Today Total: Rs. ${todayTotal.toFixed(2)}\n` +
            `Old Bal: Rs. ${oldBalance.toFixed(2)}\n` +
            `Full Amt: Rs. ${fullAmount.toFixed(2)}\n` +
            `Today Paid: Rs. ${todayPaidAmount.toFixed(2)}\n` +
            `New Bal: Rs. ${newBalance.toFixed(2)}\n` +
            `Thank you!`;

        const results = [];
        for (let i = 0; i < recipients.length; i++) {
            const rawPhone = recipients[i];
            const phone = normalizePhoneNumber(rawPhone);
            if (!phone) {
                console.log(`[SMS] Invalid recipient phone: ${rawPhone}`);
                continue;
            }

            // Sleep 1 second for consecutive recipients to prevent carrier anti-spam block
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`[SMS OUTBOX] Sending to: ${phone}`);
            console.log(`[SMS MESSAGE] "${message}"`);

            const params = new URLSearchParams({
                user_id: SMS_USER_ID,
                api_key: SMS_API_KEY,
                sender_id: SMS_SENDER_ID,
                contact: phone,
                message: message
            });

            const res = await fetch('https://smslenz.lk/api/send-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });

            const text = await res.text();
            console.log(`[SMS RESPONSE] To: ${phone} | Status: ${res.status} | Body: ${text}`);

            // Log to local file
            const logDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const logPath = path.join(logDir, 'sms_outbox.log');
            const logEntry = `[${new Date().toISOString()}] (Bakery Invoice) To: ${phone} | Status: ${res.status} | Msg: ${message.replace(/\n/g, ' ')} | Res: ${text}\n`;
            fs.appendFileSync(logPath, logEntry);

            results.push({ phone, status: res.status, response: text });
        }
        return results;
    } catch (err) {
        console.error('[SMS ERROR] Failed to send bakery invoice SMS:', err);
        return [];
    }
};
