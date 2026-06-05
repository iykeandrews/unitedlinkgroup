export declare function configureExpoNotifications(): Promise<void>;
export declare function registerExpoPush(opts?: {
    requestPermissions?: boolean;
}): Promise<string | null>;
export declare function addNotificationResponseListener(navigate: (url?: string) => void): Promise<import("expo-notifications").EventSubscription>;
