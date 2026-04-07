import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL, PurchasesOfferings, CustomerInfo } from '@revenuecat/purchases-capacitor';

const API_KEYS = {
    apple: import.meta.env.VITE_REVENUECAT_APPLE_KEY || '',
    google: import.meta.env.VITE_REVENUECAT_GOOGLE_KEY || '',
};

export class RevenueCatService {
    private static isInitialized = false;

    static async initialize(appUserId: string) {
        if (Capacitor.getPlatform() === 'web') {
            console.log('RevenueCat Web Setup bypassed. Running in Web.');
            return;
        }

        if (this.isInitialized) return;

        try {
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

            let apiKey = '';
            if (Capacitor.getPlatform() === 'ios') {
                apiKey = API_KEYS.apple;
            } else if (Capacitor.getPlatform() === 'android') {
                apiKey = API_KEYS.google;
            }

            if (!apiKey) {
                console.warn('RevenueCat API Key missing for platform.');
                return;
            }

            await Purchases.configure({ apiKey, appUserID: appUserId });
            this.isInitialized = true;
            console.log('RevenueCat Initialized successfully');
        } catch (error) {
            console.error('Failed to initialize RevenueCat:', error);
        }
    }

    static async getOfferings(): Promise<PurchasesOfferings | null> {
        if (!this.isInitialized || Capacitor.getPlatform() === 'web') return null;
        try {
            return await Purchases.getOfferings();
        } catch (error) {
            console.error('Failed to get offerings:', error);
            return null;
        }
    }

    static async startPurchase(packageToBuy: any): Promise<CustomerInfo | null> {
        if (!this.isInitialized || Capacitor.getPlatform() === 'web') {
            console.warn('Purchase attempted on web or without initialization');
            return null;
        }
        try {
            const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToBuy });
            return customerInfo;
        } catch (error: any) {
            if (!error.userCancelled) {
                console.error('Purchase failed:', error);
            }
            return null;
        }
    }

    static async getCustomerInfo(): Promise<CustomerInfo | null> {
        if (!this.isInitialized || Capacitor.getPlatform() === 'web') return null;
        try {
            const { customerInfo } = await Purchases.getCustomerInfo();
            return customerInfo;
        } catch (error) {
            console.error('Failed to get customer info:', error);
            return null;
        }
    }

    static getHighestEntitlement(customerInfo: CustomerInfo | null): 'solo' | 'mate' | 'master' {
        if (!customerInfo) return 'solo';
        
        // Ensure accurate translation from RC entitlement identifiers to our DB plans
        if (customerInfo.entitlements.active['master_tier']) return 'master';
        if (customerInfo.entitlements.active['mate_tier']) return 'mate';
        
        return 'solo';
    }
}
