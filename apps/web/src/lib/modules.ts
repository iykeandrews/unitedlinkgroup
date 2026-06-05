
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  FileText, 
  BarChart, 
  MessageSquare, 
  File, 
  Settings,
  MapPin,
  Shield,
  AlertTriangle,
  UserCheck,
  Briefcase,
  Wrench,
  Award,
  Heart,
  Pill,
  ClipboardList,
  ShieldCheck,
  Bed,
  CalendarCheck,
  Sparkles,
  ShoppingBag,
  Sprout,
  CloudRain,
  Home,
  DoorOpen,
  FileSignature,
  DollarSign,
  Package,
  Activity,
  CreditCard,
  ClipboardCheck,
  Tractor,
  Briefcase as BriefcaseIcon,
  UserCog,
  Building,
  CheckCircle,
  Clock as ClockIcon,
  FileBarChart,
  Megaphone,
  Mail,
  Upload,
  ScrollText,
  ToggleLeft,
  Sliders,
  Plug,
  Shirt,
  Tag,
  Scissors,
  Palette,
  Store,
  UserRound
} from 'lucide-react';
import { UserRole } from '@unitedlinkgroup/types';

export interface Module {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'Core' | 'Security' | 'Healthcare' | 'Hotel' | 'Agriculture' | 'Rental' | 'Fashion';
  route: string;
}

export function canAccessModule(userRole: string | null, moduleId: string) {
  if (!userRole) return true;
  const normalizedRole = String(userRole).toUpperCase() as UserRole | string;
  const employmentType = typeof window !== 'undefined' ? String(localStorage.getItem('employee_type') || '').toUpperCase() : '';
  const isOnboarding = normalizedRole === UserRole.EMPLOYEE && employmentType === 'ONBOARDING';

  if (isOnboarding) {
    return moduleId === 'My_Forms';
  }
  if (moduleId === 'Vendors') return normalizedRole === UserRole.SUPER_ADMIN;
  if (moduleId === 'My_Profile') return normalizedRole === UserRole.EMPLOYEE || normalizedRole === UserRole.MANAGER;
  if (normalizedRole === UserRole.SUPER_ADMIN || normalizedRole === UserRole.BUSINESS_ADMIN) return true;
  if (normalizedRole === 'VENDOR') return false;

  if (moduleId.startsWith('Settings_')) return false;

  if (normalizedRole === UserRole.EMPLOYEE) {
    const denied = new Set<string>([
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

export const MODULES: Module[] = [
  // Core Modules - Dashboard
  { 
    id: 'Dashboard', 
    name: 'Dashboard', 
    description: 'KPIs, Alerts, Daily summaries', 
    icon: LayoutDashboard, 
    category: 'Core',
    route: '/dashboard'
  },

  // Core Modules - People
  { 
    id: 'People', 
    name: 'Employees', 
    description: 'Staff management', 
    icon: Users, 
    category: 'Core',
    route: '/dashboard/people'
  },
  { 
    id: 'My_Profile', 
    name: 'Profile', 
    description: 'View and update your profile', 
    icon: UserRound, 
    category: 'Core',
    route: '/dashboard/profile'
  },
  {
    id: 'Vendors',
    name: 'Vendors',
    description: 'Vendor portal management',
    icon: Store,
    category: 'Core',
    route: '/dashboard/vendors'
  },
  { 
    id: 'People_Roles', 
    name: 'Roles & Permissions', 
    description: 'Manage user roles', 
    icon: UserCog, 
    category: 'Core',
    route: '/dashboard/people/roles'
  },
  { 
    id: 'People_Departments', 
    name: 'Departments', 
    description: 'Department structure', 
    icon: Building, 
    category: 'Core',
    route: '/dashboard/people/departments'
  },
  { 
    id: 'People_Certifications', 
    name: 'Certifications', 
    description: 'Track certifications', 
    icon: Award, 
    category: 'Core',
    route: '/dashboard/people/certifications'
  },
  { 
    id: 'People_Availability', 
    name: 'Availability', 
    description: 'Track employee availability', 
    icon: CalendarCheck, 
    category: 'Core',
    route: '/dashboard/people/availability'
  },
  { 
    id: 'People_EmploymentForms', 
    name: 'Employment Forms', 
    description: 'Create, assign, and track employee forms', 
    icon: FileSignature, 
    category: 'Core',
    route: '/dashboard/people/employment-forms'
  },
  { 
    id: 'People_SOPFiles', 
    name: 'SOP Files', 
    description: 'Distribute SOPs and collect acknowledgements', 
    icon: FileText, 
    category: 'Core',
    route: '/dashboard/people/sops'
  },
  { 
    id: 'People_Timesheets', 
    name: 'Timesheets', 
    description: 'Staff timesheets', 
    icon: ClockIcon, 
    category: 'Core',
    route: '/dashboard/time'
  },
  { 
    id: 'Attendance_Report', 
    name: 'Attendance Reports', 
    description: 'Monthly attendance charts', 
    icon: BarChart, 
    category: 'Core',
    route: '/dashboard/time/reports'
  },
  {
    id: 'My_Forms',
    name: 'My Forms',
    description: 'Fill and sign assigned forms',
    icon: FileSignature,
    category: 'Core',
    route: '/dashboard/forms'
  },

  // Core Modules - Operations
  { 
    id: 'Schedule', 
    name: 'Scheduling', 
    description: 'Shift scheduling', 
    icon: Calendar, 
    category: 'Core',
    route: '/dashboard/scheduling'
  },
  { 
    id: 'Ops_Assignments', 
    name: 'Assignments', 
    description: 'Task assignments', 
    icon: ClipboardList, 
    category: 'Core',
    route: '/dashboard/operations/assignments'
  },
  { 
    id: 'Time', 
    name: 'Attendance / Time Tracking', 
    description: 'Clock-in/out, Timesheets', 
    icon: Clock, 
    category: 'Core',
    route: '/dashboard/time'
  },

  // Core Modules - Finance
  { 
    id: 'Pay', 
    name: 'Payroll', 
    description: 'Payroll processing', 
    icon: DollarSign, 
    category: 'Core',
    route: '/dashboard/payroll'
  },
  { 
    id: 'Payroll_Report', 
    name: 'Payroll Reports', 
    description: 'Payroll analysis & exports', 
    icon: BarChart, 
    category: 'Core',
    route: '/dashboard/reports/payroll'
  },
  { 
    id: 'Finance_Payslips', 
    name: 'Payslips', 
    description: 'Employee payslips', 
    icon: FileText, 
    category: 'Core',
    route: '/dashboard/finance/payslips'
  },
  { 
    id: 'Finance_Loans', 
    name: 'Loans / Advances', 
    description: 'Employee loans', 
    icon: CreditCard, 
    category: 'Core',
    route: '/dashboard/requests/loans'
  },
  { 
    id: 'Finance_Invoices', 
    name: 'Invoices', 
    description: 'Client invoicing', 
    icon: FileText, 
    category: 'Core',
    route: '/dashboard/finance/invoices'
  },
  { 
    id: 'Finance_Payments', 
    name: 'Payments', 
    description: 'Payment tracking', 
    icon: DollarSign, 
    category: 'Core',
    route: '/dashboard/finance/payments'
  },
  { 
    id: 'Finance_Deductions', 
    name: 'Deductions', 
    description: 'Payroll deductions', 
    icon: DollarSign, 
    category: 'Core',
    route: '/dashboard/finance/deductions'
  },

  // Core Modules - Requests
  { 
    id: 'Leave', 
    name: 'Leave Requests', 
    description: 'Leave management', 
    icon: ClipboardCheck, 
    category: 'Core',
    route: '/dashboard/requests/leave'
  },
  { 
    id: 'Requests_Swaps', 
    name: 'Shift Swaps', 
    description: 'Shift exchange requests', 
    icon: Activity, 
    category: 'Core',
    route: '/dashboard/requests/swaps'
  },
  { 
    id: 'Requests_Loans', 
    name: 'Loan Requests', 
    description: 'Advance requests', 
    icon: CreditCard, 
    category: 'Core',
    route: '/dashboard/requests/loans'
  },
  { 
    id: 'Requests_Approvals', 
    name: 'Approval Queue', 
    description: 'Pending approvals', 
    icon: CheckCircle, 
    category: 'Core',
    route: '/dashboard/requests/approvals'
  },

  // Core Modules - Reports
  { 
    id: 'Reports_Payroll', 
    name: 'Payroll Reports', 
    description: 'Financial summaries', 
    icon: FileBarChart, 
    category: 'Core',
    route: '/dashboard/reports/payroll'
  },
  { 
    id: 'Reports_Performance', 
    name: 'Performance Reports', 
    description: 'Staff performance', 
    icon: BarChart, 
    category: 'Core',
    route: '/dashboard/reports/performance'
  },
  { 
    id: 'Reports_Compliance', 
    name: 'Compliance Reports', 
    description: 'Audit and compliance', 
    icon: ShieldCheck, 
    category: 'Core',
    route: '/dashboard/reports/compliance'
  },

  // Core Modules - Communications
  { 
    id: 'Comm_Notifications', 
    name: 'Notifications', 
    description: 'System alerts', 
    icon: MessageSquare, 
    category: 'Core',
    route: '/dashboard/communications/notifications'
  },
  { 
    id: 'Comm_Chats', 
    name: 'Chats', 
    description: 'Team group chat', 
    icon: MessageSquare, 
    category: 'Core',
    route: '/dashboard/communications/chats'
  },
  { 
    id: 'Comm_Announcements', 
    name: 'Announcements', 
    description: 'Broadcast messages', 
    icon: Megaphone, 
    category: 'Core',
    route: '/dashboard/communications/announcements'
  },
  { 
    id: 'Comm_Bulk', 
    name: 'Bulk Email / Messaging', 
    description: 'Mass communication', 
    icon: Mail, 
    category: 'Core',
    route: '/dashboard/communications/bulk'
  },

  // Core Modules - Documents
  { 
    id: 'Docs_Contracts', 
    name: 'Contracts', 
    description: 'Employee contracts', 
    icon: ScrollText, 
    category: 'Core',
    route: '/dashboard/documents/contracts'
  },
  { 
    id: 'Docs_Uploads', 
    name: 'Uploads', 
    description: 'File storage', 
    icon: Upload, 
    category: 'Core',
    route: '/dashboard/documents/uploads'
  },
  { 
    id: 'Docs_Compliance', 
    name: 'Compliance Documents', 
    description: 'Regulatory docs', 
    icon: Shield, 
    category: 'Core',
    route: '/dashboard/documents/compliance'
  },

  // Core Modules - Settings
  { 
    id: 'Settings_Profile', 
    name: 'Business Profile', 
    description: 'Company details', 
    icon: Building, 
    category: 'Core',
    route: '/dashboard/settings/profile'
  },
  { 
    id: 'Settings_Locations', 
    name: 'Locations', 
    description: 'Manage branches', 
    icon: MapPin, 
    category: 'Core',
    route: '/dashboard/settings/locations'
  },
  { 
    id: 'Settings_Roles', 
    name: 'Roles & Permissions', 
    description: 'System roles', 
    icon: UserCog, 
    category: 'Core',
    route: '/dashboard/settings/roles'
  },
  { 
    id: 'Settings_Modules', 
    name: 'Module Activation', 
    description: 'Enable/disable modules', 
    icon: ToggleLeft, 
    category: 'Core',
    route: '/dashboard/settings/modules'
  },
  { 
    id: 'Settings_Integrations', 
    name: 'Integrations', 
    description: 'Third-party apps', 
    icon: Plug, 
    category: 'Core',
    route: '/dashboard/settings/integrations'
  },
  { 
    id: 'Settings_Preferences', 
    name: 'System Preferences', 
    description: 'Global settings', 
    icon: Sliders, 
    category: 'Core',
    route: '/dashboard/settings/preferences'
  },

  // Security Industry
  { 
    id: 'Security_Sites', 
    name: 'Sites / Locations', 
    description: 'Manage security sites', 
    icon: MapPin, 
    category: 'Security',
    route: '/dashboard/security/sites'
  },
  { 
    id: 'Security_Patrol', 
    name: 'Patrol Logs', 
    description: 'Track patrols and checkpoints', 
    icon: Shield, 
    category: 'Security',
    route: '/dashboard/security/patrols'
  },
  { 
    id: 'Security_Incidents', 
    name: 'Incident Reports', 
    description: 'Log and track incidents', 
    icon: AlertTriangle, 
    category: 'Security',
    route: '/dashboard/security/incidents'
  },
  { 
    id: 'Security_Visitors', 
    name: 'Visitor Logs', 
    description: 'Track visitors and access', 
    icon: UserCheck, 
    category: 'Security',
    route: '/dashboard/security/visitors'
  },
  { 
    id: 'Security_Clients', 
    name: 'Client Accounts', 
    description: 'Manage security clients', 
    icon: Briefcase, 
    category: 'Security',
    route: '/dashboard/security/clients'
  },
  { 
    id: 'Security_Assets', 
    name: 'Equipment / Assets', 
    description: 'Manage security gear', 
    icon: Wrench, 
    category: 'Security',
    route: '/dashboard/security/assets'
  },
  { 
    id: 'Security_Compliance', 
    name: 'Compliance', 
    description: 'Licensing and compliance', 
    icon: Award, 
    category: 'Security',
    route: '/dashboard/security/compliance'
  },

  // Healthcare Industry
  { 
    id: 'Health_Patients', 
    name: 'Patients', 
    description: 'Patient management', 
    icon: Users, 
    category: 'Healthcare',
    route: '/dashboard/healthcare/patients'
  },
  { 
    id: 'Health_Appointments', 
    name: 'Appointments', 
    description: 'Scheduling and visits', 
    icon: CalendarCheck, 
    category: 'Healthcare',
    route: '/dashboard/healthcare/appointments'
  },
  { 
    id: 'Health_Records', 
    name: 'Medical Records', 
    description: 'EHR and history', 
    icon: FileText, 
    category: 'Healthcare',
    route: '/dashboard/healthcare/records'
  },
  { 
    id: 'Health_Prescriptions', 
    name: 'Prescriptions', 
    description: 'Medication management', 
    icon: Pill, 
    category: 'Healthcare',
    route: '/dashboard/healthcare/prescriptions'
  },
  { 
    id: 'Health_CarePlans', 
    name: 'Care Plans', 
    description: 'Treatment plans', 
    icon: ClipboardList, 
    category: 'Healthcare',
    route: '/dashboard/healthcare/care-plans'
  },
  { 
    id: 'Health_Insurance', 
    name: 'Insurance & Billing', 
    description: 'Claims and payments', 
    icon: ShieldCheck, 
    category: 'Healthcare',
    route: '/dashboard/healthcare/insurance'
  },
  { 
    id: 'Health_Compliance', 
    name: 'Compliance & Audits', 
    description: 'Regulatory compliance', 
    icon: Activity, 
    category: 'Healthcare',
    route: '/dashboard/healthcare/compliance'
  },

  // Hotel Industry
  { 
    id: 'Hotel_Rooms', 
    name: 'Rooms', 
    description: 'Room management', 
    icon: Bed, 
    category: 'Hotel',
    route: '/dashboard/hotel/rooms'
  },
  { 
    id: 'Hotel_Reservations', 
    name: 'Reservations', 
    description: 'Booking management', 
    icon: CalendarCheck, 
    category: 'Hotel',
    route: '/dashboard/hotel/reservations'
  },
  { 
    id: 'Hotel_Guests', 
    name: 'Guests', 
    description: 'Guest profiles', 
    icon: Users, 
    category: 'Hotel',
    route: '/dashboard/hotel/guests'
  },
  { 
    id: 'Hotel_Housekeeping', 
    name: 'Housekeeping', 
    description: 'Cleaning schedules', 
    icon: Sparkles, 
    category: 'Hotel',
    route: '/dashboard/hotel/housekeeping'
  },
  { 
    id: 'Hotel_Maintenance', 
    name: 'Maintenance', 
    description: 'Repairs and upkeep', 
    icon: Wrench, 
    category: 'Hotel',
    route: '/dashboard/hotel/maintenance'
  },
  { 
    id: 'Hotel_POS', 
    name: 'POS / Billing', 
    description: 'Point of sale', 
    icon: ShoppingBag, 
    category: 'Hotel',
    route: '/dashboard/hotel/pos'
  },

  // Agriculture Industry
  { 
    id: 'Agri_Farms', 
    name: 'Farms / Fields', 
    description: 'Land management', 
    icon: MapPin, 
    category: 'Agriculture',
    route: '/dashboard/agriculture/farms'
  },
  { 
    id: 'Agri_Crops', 
    name: 'Crops', 
    description: 'Crop cycles and tracking', 
    icon: Sprout, 
    category: 'Agriculture',
    route: '/dashboard/agriculture/crops'
  },
  { 
    id: 'Agri_Livestock', 
    name: 'Livestock', 
    description: 'Animal management', 
    icon: Activity, 
    category: 'Agriculture',
    route: '/dashboard/agriculture/livestock'
  },
  { 
    id: 'Agri_Equipment', 
    name: 'Equipment', 
    description: 'Machinery tracking', 
    icon: Tractor, 
    category: 'Agriculture',
    route: '/dashboard/agriculture/equipment'
  },
  { 
    id: 'Agri_Inventory', 
    name: 'Inventory', 
    description: 'Stock and supplies', 
    icon: Package, 
    category: 'Agriculture',
    route: '/dashboard/agriculture/inventory'
  },
  { 
    id: 'Agri_Weather', 
    name: 'Weather Tracking', 
    description: 'Forecasts and logs', 
    icon: CloudRain, 
    category: 'Agriculture',
    route: '/dashboard/agriculture/weather'
  },
  { 
    id: 'Agri_Harvest', 
    name: 'Harvest', 
    description: 'Yield management', 
    icon: ShoppingBag, 
    category: 'Agriculture',
    route: '/dashboard/agriculture/harvest'
  },

  // Rental / Property Management
  { 
    id: 'Rental_Properties', 
    name: 'Properties', 
    description: 'Property listings', 
    icon: Home, 
    category: 'Rental',
    route: '/dashboard/rental/properties'
  },
  { 
    id: 'Rental_Units', 
    name: 'Units', 
    description: 'Unit management', 
    icon: DoorOpen, 
    category: 'Rental',
    route: '/dashboard/rental/units'
  },
  { 
    id: 'Rental_Tenants', 
    name: 'Tenants', 
    description: 'Tenant profiles', 
    icon: Users, 
    category: 'Rental',
    route: '/dashboard/rental/tenants'
  },
  { 
    id: 'Rental_Leases', 
    name: 'Leases', 
    description: 'Contracts and terms', 
    icon: FileSignature, 
    category: 'Rental',
    route: '/dashboard/rental/leases'
  },
  { 
    id: 'Rental_Maintenance', 
    name: 'Maintenance', 
    description: 'Requests and repairs', 
    icon: Wrench, 
    category: 'Rental',
    route: '/dashboard/rental/maintenance'
  },
  { 
    id: 'Rental_Rent', 
    name: 'Rent & Invoicing', 
    description: 'Payments and billing', 
    icon: DollarSign, 
    category: 'Rental',
    route: '/dashboard/rental/rent'
  },
  
  // Fashion Industry
  { 
    id: 'Fashion_Inventory', 
    name: 'Inventory & Stock', 
    description: 'Manage clothes, sizes, colors', 
    icon: Shirt, 
    category: 'Fashion',
    route: '/dashboard/fashion/inventory'
  },
  { 
    id: 'Fashion_Products', 
    name: 'Products & Collections', 
    description: 'Manage designs and catalogs', 
    icon: Tag, 
    category: 'Fashion',
    route: '/dashboard/fashion/products'
  },
  { 
    id: 'Fashion_POS', 
    name: 'Point of Sale', 
    description: 'In-store sales', 
    icon: Store, 
    category: 'Fashion',
    route: '/dashboard/fashion/pos'
  },
  { 
    id: 'Fashion_Design', 
    name: 'Design & Production', 
    description: 'Track designs and manufacturing', 
    icon: Palette, 
    category: 'Fashion',
    route: '/dashboard/fashion/design'
  },
  { 
    id: 'Fashion_Models', 
    name: 'Models & Talent', 
    description: 'Manage models and bookings', 
    icon: Users, 
    category: 'Fashion',
    route: '/dashboard/fashion/models'
  },
  { 
    id: 'Fashion_Alterations', 
    name: 'Alterations & Repairs', 
    description: 'Tailoring services', 
    icon: Scissors, 
    category: 'Fashion',
    route: '/dashboard/fashion/alterations'
  }
];
