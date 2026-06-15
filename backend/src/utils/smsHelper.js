import fs from 'fs';
import path from 'path';

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
        const message = `Dear ${order.customerSnapshot.name}, thank you for buying from Hoorawa! Bill No: ${invoiceNum}, Items: ${itemsSummary}. Total: LKR ${total.toFixed(2)}. paymentStatus: ${invoice?.paymentStatus || 'paid'}.`;

        console.log(`\n========================================`);
        console.log(`[SMS OUTBOX] Triggered send to: ${phone}`);
        console.log(`[SMS MESSAGE] "${message}"`);
        
        // Prepare request parameters for SMSLenz
        const params = new URLSearchParams({
            user_id: '1927',
            api_key: '3df0dbae-24c7-42f6-80fb-925c8ca35b50',
            sender_id: 'SMSlenzDEMO',
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
            user_id: '1927',
            api_key: '3df0dbae-24c7-42f6-80fb-925c8ca35b50',
            sender_id: 'SMSlenzDEMO',
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
