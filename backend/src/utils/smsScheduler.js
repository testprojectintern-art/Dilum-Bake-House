import Customer from '../models/Customer.js';
import { sendGeneralSms } from './smsHelper.js';

/**
 * Checks for customer birthdays and anniversaries and sends automated SMS greetings.
 */
export const checkAndSendAnniversarySms = async () => {
    try {
        console.log('[SMS SCHEDULER] Running daily check for birthdays and anniversaries...');
        const now = new Date();
        const todayMonth = now.getMonth() + 1; // 1-indexed month
        const todayDay = now.getDate(); // Day of month

        // 1. Find customers with birthdays today
        const birthdayCustomers = await Customer.find({
            status: 'active',
            birthday: { $ne: null },
            deletedAt: null,
            $expr: {
                $and: [
                    { $eq: [{ $month: '$birthday' }, todayMonth] },
                    { $eq: [{ $dayOfMonth: '$birthday' }, todayDay] }
                ]
            }
        });

        console.log(`[SMS SCHEDULER] Found ${birthdayCustomers.length} birthday customers today.`);
        for (const customer of birthdayCustomers) {
            const phone = customer.primaryContact?.phone || customer.primaryContact?.mobile || customer.billingAddress?.phone;
            if (phone) {
                const message = `Dear ${customer.displayName}, Happy Birthday from Dilum Bake House! Celebrate your day with a special discount. Use coupon HBD10 on your next purchase.`;
                await sendGeneralSms(phone, message);
            } else {
                console.log(`[SMS SCHEDULER] Skipping birthday SMS for ${customer.displayName}: No phone number.`);
            }
        }

        // 2. Find customers with anniversaries today
        const anniversaryCustomers = await Customer.find({
            status: 'active',
            anniversaryDate: { $ne: null },
            deletedAt: null,
            $expr: {
                $and: [
                    { $eq: [{ $month: '$anniversaryDate' }, todayMonth] },
                    { $eq: [{ $dayOfMonth: '$anniversaryDate' }, todayDay] }
                ]
            }
        });

        console.log(`[SMS SCHEDULER] Found ${anniversaryCustomers.length} anniversary customers today.`);
        for (const customer of anniversaryCustomers) {
            const phone = customer.primaryContact?.phone || customer.primaryContact?.mobile || customer.billingAddress?.phone;
            if (phone) {
                const message = `Dear ${customer.displayName}, Happy Anniversary from Dilum Bake House! Enjoy a special discount on bakery items as a thank you for your loyalty. Use coupon ANNIV10.`;
                await sendGeneralSms(phone, message);
            } else {
                console.log(`[SMS SCHEDULER] Skipping anniversary SMS for ${customer.displayName}: No phone number.`);
            }
        }

        console.log('[SMS SCHEDULER] Daily scheduler run completed successfully.');
    } catch (error) {
        console.error('[SMS SCHEDULER ERROR] Failed in checking birthdays/anniversaries:', error);
    }
};

/**
 * Initializes the automated daily anniversary SMS task.
 * Schedules the task to run once every 24 hours.
 */
export const initSmsScheduler = () => {
    // Run once on startup (with a small delay to avoid slowing server boot)
    setTimeout(() => {
        checkAndSendAnniversarySms();
    }, 10000); // 10 seconds after server starts

    // Calculate time until next check (e.g. next day 9:00 AM)
    const getMsUntilNextNineAM = () => {
        const now = new Date();
        const target = new Date();
        target.setHours(9, 0, 0, 0); // 9:00 AM today

        if (now >= target) {
            // Target is past, set for tomorrow
            target.setDate(target.getDate() + 1);
        }
        return target.getTime() - now.getTime();
    };

    const scheduleNextRun = () => {
        const delay = getMsUntilNextNineAM();
        console.log(`[SMS SCHEDULER] Next automatic run scheduled in ${Math.round(delay / (1000 * 60))} minutes (at 9:00 AM).`);
        
        setTimeout(async () => {
            await checkAndSendAnniversarySms();
            // Reschedule after execution
            scheduleNextRun();
        }, delay);
    };

    scheduleNextRun();
};
