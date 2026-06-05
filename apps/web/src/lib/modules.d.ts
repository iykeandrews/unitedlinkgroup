export interface Module {
    id: string;
    name: string;
    description: string;
    icon: any;
    category: 'Core' | 'Security' | 'Healthcare' | 'Hotel' | 'Agriculture' | 'Rental' | 'Fashion';
    route: string;
}
export declare function canAccessModule(userRole: string | null, moduleId: string): boolean;
export declare const MODULES: Module[];
