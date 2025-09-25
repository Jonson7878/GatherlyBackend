import cron from 'node-cron';
import PromoCode from '../models/promoCodeModel.js';

export const updateExpiredPromoCodes = async () => {

    try {
        console.log(new Date().toISOString())
        const currentDate = new Date();
        
        const result = await PromoCode.updateMany(
            {
                expiresAt: { $lt: currentDate },
                isActive: true
            },
            {
                $set: { isActive: false }
            }
        );

        console.log(`Updated ${result.modifiedCount} expired promo codes`);
        console.log(new Date().toISOString())
    } catch (error) {
        console.error('Error in cron job updating promo codes:', error);
    }
};

export const startPromoCodeCronJob = () => {
    cron.schedule('0 0 * * *', async () => {
    
        console.log('Running promo code expiration check...');
        
        await updateExpiredPromoCodes();
        
    });
    
    updateExpiredPromoCodes();
};
