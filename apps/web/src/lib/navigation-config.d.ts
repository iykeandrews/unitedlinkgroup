export type NavGroupKey = 'People' | 'Operations' | 'Finance' | 'Requests' | 'Insights';
export interface NavGroup {
    key: NavGroupKey;
    label: string;
    icon?: any;
    moduleIds: string[];
}
export declare const NAV_GROUPS: NavGroup[];
