"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULES = void 0;
exports.canAccessModule = canAccessModule;
const lucide_react_1 = require("lucide-react");
const types_1 = require("@unitedlinkgroup/types");
function canAccessModule(userRole, moduleId) {
    if (!userRole)
        return true;
    const normalizedRole = String(userRole).toUpperCase();
    const employmentType = typeof window !== 'undefined' ? String(localStorage.getItem('employee_type') || '').toUpperCase() : '';
    const isOnboarding = normalizedRole === types_1.UserRole.EMPLOYEE && employmentType === 'ONBOARDING';
    if (isOnboarding) {
        return moduleId === 'My_Forms';
    }
    if (moduleId === 'Vendors')
        return normalizedRole === types_1.UserRole.SUPER_ADMIN;
    if (moduleId === 'My_Profile')
        return normalizedRole === types_1.UserRole.EMPLOYEE || normalizedRole === types_1.UserRole.MANAGER;
    if (normalizedRole === types_1.UserRole.SUPER_ADMIN || normalizedRole === types_1.UserRole.BUSINESS_ADMIN)
        return true;
    if (normalizedRole === 'VENDOR')
        return false;
    if (moduleId.startsWith('Settings_'))
        return false;
    if (normalizedRole === types_1.UserRole.EMPLOYEE) {
        const denied = new Set([
            'People',
            'People_Roles',
            'People_Departments',
            'People_EmploymentForms',
            'People_SOPFiles',
            'Pay',
            'Payroll_Report',
            'Finance_Invoices',
            'Finance_Payments',
            'Finance_Deductions',
            'Reports_Payroll',
            'Reports_Performance',
            'Reports_Compliance',
            'Docs_Contracts',
            'Docs_Uploads',
            'Docs_Compliance',
            'Comm_Bulk',
            'Attendance_Report',
            'Requests_Approvals',
            'Security_Sites',
            'Security_Clients',
            'Security_Assets',
            'Security_Compliance',
        ]);
        return !denied.has(moduleId);
    }
    return true;
}
exports.MODULES = [
    // Core Modules - Dashboard
    {
        id: 'Dashboard',
        name: 'Dashboard',
        description: 'KPIs, Alerts, Daily summaries',
        icon: lucide_react_1.LayoutDashboard,
        category: 'Core',
        route: '/dashboard'
    },
    // Core Modules - People
    {
        id: 'People',
        name: 'Employees',
        description: 'Staff management',
        icon: lucide_react_1.Users,
        category: 'Core',
        route: '/dashboard/people'
    },
    {
        id: 'My_Profile',
        name: 'Profile',
        description: 'View and update your profile',
        icon: lucide_react_1.UserRound,
        category: 'Core',
        route: '/dashboard/profile'
    },
    {
        id: 'Vendors',
        name: 'Vendors',
        description: 'Vendor portal management',
        icon: lucide_react_1.Store,
        category: 'Core',
        route: '/dashboard/vendors'
    },
    {
        id: 'People_Roles',
        name: 'Roles & Permissions',
        description: 'Manage user roles',
        icon: lucide_react_1.UserCog,
        category: 'Core',
        route: '/dashboard/people/roles'
    },
    {
        id: 'People_Departments',
        name: 'Departments',
        description: 'Department structure',
        icon: lucide_react_1.Building,
        category: 'Core',
        route: '/dashboard/people/departments'
    },
    {
        id: 'People_Certifications',
        name: 'Certifications',
        description: 'Track certifications',
        icon: lucide_react_1.Award,
        category: 'Core',
        route: '/dashboard/people/certifications'
    },
    {
        id: 'People_Availability',
        name: 'Availability',
        description: 'Track employee availability',
        icon: lucide_react_1.CalendarCheck,
        category: 'Core',
        route: '/dashboard/people/availability'
    },
    {
        id: 'People_EmploymentForms',
        name: 'Employment Forms',
        description: 'Create, assign, and track employee forms',
        icon: lucide_react_1.FileSignature,
        category: 'Core',
        route: '/dashboard/people/employment-forms'
    },
    {
        id: 'People_SOPFiles',
        name: 'SOP Files',
        description: 'Distribute SOPs and collect acknowledgements',
        icon: lucide_react_1.FileText,
        category: 'Core',
        route: '/dashboard/people/sops'
    },
    {
        id: 'People_Timesheets',
        name: 'Timesheets',
        description: 'Staff timesheets',
        icon: lucide_react_1.Clock,
        category: 'Core',
        route: '/dashboard/time'
    },
    {
        id: 'Attendance_Report',
        name: 'Attendance Reports',
        description: 'Monthly attendance charts',
        icon: lucide_react_1.BarChart,
        category: 'Core',
        route: '/dashboard/time/reports'
    },
    {
        id: 'My_Forms',
        name: 'My Forms',
        description: 'Fill and sign assigned forms',
        icon: lucide_react_1.FileSignature,
        category: 'Core',
        route: '/dashboard/forms'
    },
    // Core Modules - Operations
    {
        id: 'Schedule',
        name: 'Scheduling',
        description: 'Shift scheduling',
        icon: lucide_react_1.Calendar,
        category: 'Core',
        route: '/dashboard/scheduling'
    },
    {
        id: 'Ops_Assignments',
        name: 'Assignments',
        description: 'Task assignments',
        icon: lucide_react_1.ClipboardList,
        category: 'Core',
        route: '/dashboard/operations/assignments'
    },
    {
        id: 'Time',
        name: 'Attendance / Time Tracking',
        description: 'Clock-in/out, Timesheets',
        icon: lucide_react_1.Clock,
        category: 'Core',
        route: '/dashboard/time'
    },
    // Core Modules - Finance
    {
        id: 'Pay',
        name: 'Payroll',
        description: 'Payroll processing',
        icon: lucide_react_1.DollarSign,
        category: 'Core',
        route: '/dashboard/payroll'
    },
    {
        id: 'Payroll_Report',
        name: 'Payroll Reports',
        description: 'Payroll analysis & exports',
        icon: lucide_react_1.BarChart,
        category: 'Core',
        route: '/dashboard/reports/payroll'
    },
    {
        id: 'Finance_Payslips',
        name: 'Payslips',
        description: 'Employee payslips',
        icon: lucide_react_1.FileText,
        category: 'Core',
        route: '/dashboard/finance/payslips'
    },
    {
        id: 'Finance_Loans',
        name: 'Loans / Advances',
        description: 'Employee loans',
        icon: lucide_react_1.CreditCard,
        category: 'Core',
        route: '/dashboard/requests/loans'
    },
    {
        id: 'Finance_Invoices',
        name: 'Invoices',
        description: 'Client invoicing',
        icon: lucide_react_1.FileText,
        category: 'Core',
        route: '/dashboard/finance/invoices'
    },
    {
        id: 'Finance_Payments',
        name: 'Payments',
        description: 'Payment tracking',
        icon: lucide_react_1.DollarSign,
        category: 'Core',
        route: '/dashboard/finance/payments'
    },
    {
        id: 'Finance_Deductions',
        name: 'Deductions',
        description: 'Payroll deductions',
        icon: lucide_react_1.DollarSign,
        category: 'Core',
        route: '/dashboard/finance/deductions'
    },
    // Core Modules - Requests
    {
        id: 'Leave',
        name: 'Leave Requests',
        description: 'Leave management',
        icon: lucide_react_1.ClipboardCheck,
        category: 'Core',
        route: '/dashboard/requests/leave'
    },
    {
        id: 'Requests_Swaps',
        name: 'Shift Swaps',
        description: 'Shift exchange requests',
        icon: lucide_react_1.Activity,
        category: 'Core',
        route: '/dashboard/requests/swaps'
    },
    {
        id: 'Requests_Loans',
        name: 'Loan Requests',
        description: 'Advance requests',
        icon: lucide_react_1.CreditCard,
        category: 'Core',
        route: '/dashboard/requests/loans'
    },
    {
        id: 'Requests_Approvals',
        name: 'Approval Queue',
        description: 'Pending approvals',
        icon: lucide_react_1.CheckCircle,
        category: 'Core',
        route: '/dashboard/requests/approvals'
    },
    // Core Modules - Reports
    {
        id: 'Reports_Payroll',
        name: 'Payroll Reports',
        description: 'Financial summaries',
        icon: lucide_react_1.FileBarChart,
        category: 'Core',
        route: '/dashboard/reports/payroll'
    },
    {
        id: 'Reports_Performance',
        name: 'Performance Reports',
        description: 'Staff performance',
        icon: lucide_react_1.BarChart,
        category: 'Core',
        route: '/dashboard/reports/performance'
    },
    {
        id: 'Reports_Compliance',
        name: 'Compliance Reports',
        description: 'Audit and compliance',
        icon: lucide_react_1.ShieldCheck,
        category: 'Core',
        route: '/dashboard/reports/compliance'
    },
    // Core Modules - Communications
    {
        id: 'Comm_Notifications',
        name: 'Notifications',
        description: 'System alerts',
        icon: lucide_react_1.MessageSquare,
        category: 'Core',
        route: '/dashboard/communications/notifications'
    },
    {
        id: 'Comm_Chats',
        name: 'Chats',
        description: 'Team group chat',
        icon: lucide_react_1.MessageSquare,
        category: 'Core',
        route: '/dashboard/communications/chats'
    },
    {
        id: 'Comm_Announcements',
        name: 'Announcements',
        description: 'Broadcast messages',
        icon: lucide_react_1.Megaphone,
        category: 'Core',
        route: '/dashboard/communications/announcements'
    },
    {
        id: 'Comm_Bulk',
        name: 'Bulk Email / Messaging',
        description: 'Mass communication',
        icon: lucide_react_1.Mail,
        category: 'Core',
        route: '/dashboard/communications/bulk'
    },
    // Core Modules - Documents
    {
        id: 'Docs_Contracts',
        name: 'Contracts',
        description: 'Employee contracts',
        icon: lucide_react_1.ScrollText,
        category: 'Core',
        route: '/dashboard/documents/contracts'
    },
    {
        id: 'Docs_Uploads',
        name: 'Uploads',
        description: 'File storage',
        icon: lucide_react_1.Upload,
        category: 'Core',
        route: '/dashboard/documents/uploads'
    },
    {
        id: 'Docs_Compliance',
        name: 'Compliance Documents',
        description: 'Regulatory docs',
        icon: lucide_react_1.Shield,
        category: 'Core',
        route: '/dashboard/documents/compliance'
    },
    // Core Modules - Settings
    {
        id: 'Settings_Profile',
        name: 'Business Profile',
        description: 'Company details',
        icon: lucide_react_1.Building,
        category: 'Core',
        route: '/dashboard/settings/profile'
    },
    {
        id: 'Settings_Locations',
        name: 'Locations',
        description: 'Manage branches',
        icon: lucide_react_1.MapPin,
        category: 'Core',
        route: '/dashboard/settings/locations'
    },
    {
        id: 'Settings_Roles',
        name: 'Roles & Permissions',
        description: 'System roles',
        icon: lucide_react_1.UserCog,
        category: 'Core',
        route: '/dashboard/settings/roles'
    },
    {
        id: 'Settings_Modules',
        name: 'Module Activation',
        description: 'Enable/disable modules',
        icon: lucide_react_1.ToggleLeft,
        category: 'Core',
        route: '/dashboard/settings/modules'
    },
    {
        id: 'Settings_Integrations',
        name: 'Integrations',
        description: 'Third-party apps',
        icon: lucide_react_1.Plug,
        category: 'Core',
        route: '/dashboard/settings/integrations'
    },
    {
        id: 'Settings_Preferences',
        name: 'System Preferences',
        description: 'Global settings',
        icon: lucide_react_1.Sliders,
        category: 'Core',
        route: '/dashboard/settings/preferences'
    },
    // Security Industry
    {
        id: 'Security_Sites',
        name: 'Sites / Locations',
        description: 'Manage security sites',
        icon: lucide_react_1.MapPin,
        category: 'Security',
        route: '/dashboard/security/sites'
    },
    {
        id: 'Security_Patrol',
        name: 'Patrol Logs',
        description: 'Track patrols and checkpoints',
        icon: lucide_react_1.Shield,
        category: 'Security',
        route: '/dashboard/security/patrols'
    },
    {
        id: 'Security_Incidents',
        name: 'Incident Reports',
        description: 'Log and track incidents',
        icon: lucide_react_1.AlertTriangle,
        category: 'Security',
        route: '/dashboard/security/incidents'
    },
    {
        id: 'Security_Visitors',
        name: 'Visitor Logs',
        description: 'Track visitors and access',
        icon: lucide_react_1.UserCheck,
        category: 'Security',
        route: '/dashboard/security/visitors'
    },
    {
        id: 'Security_Clients',
        name: 'Client Accounts',
        description: 'Manage security clients',
        icon: lucide_react_1.Briefcase,
        category: 'Security',
        route: '/dashboard/security/clients'
    },
    {
        id: 'Security_Assets',
        name: 'Equipment / Assets',
        description: 'Manage security gear',
        icon: lucide_react_1.Wrench,
        category: 'Security',
        route: '/dashboard/security/assets'
    },
    {
        id: 'Security_Compliance',
        name: 'Compliance',
        description: 'Licensing and compliance',
        icon: lucide_react_1.Award,
        category: 'Security',
        route: '/dashboard/security/compliance'
    },
    // Healthcare Industry
    {
        id: 'Health_Patients',
        name: 'Patients',
        description: 'Patient management',
        icon: lucide_react_1.Users,
        category: 'Healthcare',
        route: '/dashboard/healthcare/patients'
    },
    {
        id: 'Health_Appointments',
        name: 'Appointments',
        description: 'Scheduling and visits',
        icon: lucide_react_1.CalendarCheck,
        category: 'Healthcare',
        route: '/dashboard/healthcare/appointments'
    },
    {
        id: 'Health_Records',
        name: 'Medical Records',
        description: 'EHR and history',
        icon: lucide_react_1.FileText,
        category: 'Healthcare',
        route: '/dashboard/healthcare/records'
    },
    {
        id: 'Health_Prescriptions',
        name: 'Prescriptions',
        description: 'Medication management',
        icon: lucide_react_1.Pill,
        category: 'Healthcare',
        route: '/dashboard/healthcare/prescriptions'
    },
    {
        id: 'Health_CarePlans',
        name: 'Care Plans',
        description: 'Treatment plans',
        icon: lucide_react_1.ClipboardList,
        category: 'Healthcare',
        route: '/dashboard/healthcare/care-plans'
    },
    {
        id: 'Health_Insurance',
        name: 'Insurance & Billing',
        description: 'Claims and payments',
        icon: lucide_react_1.ShieldCheck,
        category: 'Healthcare',
        route: '/dashboard/healthcare/insurance'
    },
    {
        id: 'Health_Compliance',
        name: 'Compliance & Audits',
        description: 'Regulatory compliance',
        icon: lucide_react_1.Activity,
        category: 'Healthcare',
        route: '/dashboard/healthcare/compliance'
    },
    // Hotel Industry
    {
        id: 'Hotel_Rooms',
        name: 'Rooms',
        description: 'Room management',
        icon: lucide_react_1.Bed,
        category: 'Hotel',
        route: '/dashboard/hotel/rooms'
    },
    {
        id: 'Hotel_Reservations',
        name: 'Reservations',
        description: 'Booking management',
        icon: lucide_react_1.CalendarCheck,
        category: 'Hotel',
        route: '/dashboard/hotel/reservations'
    },
    {
        id: 'Hotel_Guests',
        name: 'Guests',
        description: 'Guest profiles',
        icon: lucide_react_1.Users,
        category: 'Hotel',
        route: '/dashboard/hotel/guests'
    },
    {
        id: 'Hotel_Housekeeping',
        name: 'Housekeeping',
        description: 'Cleaning schedules',
        icon: lucide_react_1.Sparkles,
        category: 'Hotel',
        route: '/dashboard/hotel/housekeeping'
    },
    {
        id: 'Hotel_Maintenance',
        name: 'Maintenance',
        description: 'Repairs and upkeep',
        icon: lucide_react_1.Wrench,
        category: 'Hotel',
        route: '/dashboard/hotel/maintenance'
    },
    {
        id: 'Hotel_POS',
        name: 'POS / Billing',
        description: 'Point of sale',
        icon: lucide_react_1.ShoppingBag,
        category: 'Hotel',
        route: '/dashboard/hotel/pos'
    },
    // Agriculture Industry
    {
        id: 'Agri_Farms',
        name: 'Farms / Fields',
        description: 'Land management',
        icon: lucide_react_1.MapPin,
        category: 'Agriculture',
        route: '/dashboard/agriculture/farms'
    },
    {
        id: 'Agri_Crops',
        name: 'Crops',
        description: 'Crop cycles and tracking',
        icon: lucide_react_1.Sprout,
        category: 'Agriculture',
        route: '/dashboard/agriculture/crops'
    },
    {
        id: 'Agri_Livestock',
        name: 'Livestock',
        description: 'Animal management',
        icon: lucide_react_1.Activity,
        category: 'Agriculture',
        route: '/dashboard/agriculture/livestock'
    },
    {
        id: 'Agri_Equipment',
        name: 'Equipment',
        description: 'Machinery tracking',
        icon: lucide_react_1.Tractor,
        category: 'Agriculture',
        route: '/dashboard/agriculture/equipment'
    },
    {
        id: 'Agri_Inventory',
        name: 'Inventory',
        description: 'Stock and supplies',
        icon: lucide_react_1.Package,
        category: 'Agriculture',
        route: '/dashboard/agriculture/inventory'
    },
    {
        id: 'Agri_Weather',
        name: 'Weather Tracking',
        description: 'Forecasts and logs',
        icon: lucide_react_1.CloudRain,
        category: 'Agriculture',
        route: '/dashboard/agriculture/weather'
    },
    {
        id: 'Agri_Harvest',
        name: 'Harvest',
        description: 'Yield management',
        icon: lucide_react_1.ShoppingBag,
        category: 'Agriculture',
        route: '/dashboard/agriculture/harvest'
    },
    // Rental / Property Management
    {
        id: 'Rental_Properties',
        name: 'Properties',
        description: 'Property listings',
        icon: lucide_react_1.Home,
        category: 'Rental',
        route: '/dashboard/rental/properties'
    },
    {
        id: 'Rental_Units',
        name: 'Units',
        description: 'Unit management',
        icon: lucide_react_1.DoorOpen,
        category: 'Rental',
        route: '/dashboard/rental/units'
    },
    {
        id: 'Rental_Tenants',
        name: 'Tenants',
        description: 'Tenant profiles',
        icon: lucide_react_1.Users,
        category: 'Rental',
        route: '/dashboard/rental/tenants'
    },
    {
        id: 'Rental_Leases',
        name: 'Leases',
        description: 'Contracts and terms',
        icon: lucide_react_1.FileSignature,
        category: 'Rental',
        route: '/dashboard/rental/leases'
    },
    {
        id: 'Rental_Maintenance',
        name: 'Maintenance',
        description: 'Requests and repairs',
        icon: lucide_react_1.Wrench,
        category: 'Rental',
        route: '/dashboard/rental/maintenance'
    },
    {
        id: 'Rental_Rent',
        name: 'Rent & Invoicing',
        description: 'Payments and billing',
        icon: lucide_react_1.DollarSign,
        category: 'Rental',
        route: '/dashboard/rental/rent'
    },
    // Fashion Industry
    {
        id: 'Fashion_Inventory',
        name: 'Inventory & Stock',
        description: 'Manage clothes, sizes, colors',
        icon: lucide_react_1.Shirt,
        category: 'Fashion',
        route: '/dashboard/fashion/inventory'
    },
    {
        id: 'Fashion_Products',
        name: 'Products & Collections',
        description: 'Manage designs and catalogs',
        icon: lucide_react_1.Tag,
        category: 'Fashion',
        route: '/dashboard/fashion/products'
    },
    {
        id: 'Fashion_POS',
        name: 'Point of Sale',
        description: 'In-store sales',
        icon: lucide_react_1.Store,
        category: 'Fashion',
        route: '/dashboard/fashion/pos'
    },
    {
        id: 'Fashion_Design',
        name: 'Design & Production',
        description: 'Track designs and manufacturing',
        icon: lucide_react_1.Palette,
        category: 'Fashion',
        route: '/dashboard/fashion/design'
    },
    {
        id: 'Fashion_Models',
        name: 'Models & Talent',
        description: 'Manage models and bookings',
        icon: lucide_react_1.Users,
        category: 'Fashion',
        route: '/dashboard/fashion/models'
    },
    {
        id: 'Fashion_Alterations',
        name: 'Alterations & Repairs',
        description: 'Tailoring services',
        icon: lucide_react_1.Scissors,
        category: 'Fashion',
        route: '/dashboard/fashion/alterations'
    }
];
