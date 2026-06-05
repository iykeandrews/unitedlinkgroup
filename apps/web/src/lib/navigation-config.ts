
import {
  Users, 
  BarChart, 
  Briefcase,
  DollarSign,
  ClipboardCheck,
} from 'lucide-react';

export type NavGroupKey = 'People' | 'Operations' | 'Finance' | 'Requests' | 'Insights';

export interface NavGroup {
  key: NavGroupKey;
  label: string;
  icon?: any;
  moduleIds: string[]; // List of module IDs that belong to this group
}

// Define the six-item navigation (Dashboard is handled separately, plus five groups here)
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'People',
    label: 'People',
    icon: Users,
    moduleIds: [
      'My_Profile',
      'People',
      'People_Roles',
      'People_Departments',
      'People_Certifications',
      'People_Availability',
      'People_EmploymentForms',
      'People_SOPFiles',
      'My_Forms',
      'Comm_Notifications',
      'Comm_Chats',
      'Comm_Announcements',
      'Comm_Bulk'
    ]
  },
  {
    key: 'Operations',
    label: 'Operations',
    icon: Briefcase, // Generic briefcase for work/ops
    moduleIds: [
      'Schedule',
      'Ops_Assignments',
      'Time',
      'Attendance_Report',
      'Security_Sites',
      'Security_Patrol',
      'Security_Incidents',
      'Security_Visitors',
      'Security_Clients',
      'Security_Assets',
      'Security_Compliance',
      'Hotel_Rooms',
      'Hotel_Reservations',
      'Hotel_Guests',
      'Hotel_Housekeeping',
      'Hotel_Maintenance',
      'Hotel_POS',
      'Agri_Farms',
      'Agri_Crops',
      'Agri_Livestock',
      'Agri_Equipment',
      'Agri_Inventory',
      'Agri_Weather',
      'Agri_Harvest',
      'Rental_Properties',
      'Rental_Units',
      'Rental_Tenants',
      'Rental_Leases',
      'Rental_Maintenance',
      'Rental_Rent',
      'Fashion_Inventory',
      'Fashion_Products',
      'Fashion_POS',
      'Fashion_Design',
      'Fashion_Models',
      'Fashion_Alterations'
    ]
  },
  {
    key: 'Finance',
    label: 'Finance',
    icon: DollarSign,
    moduleIds: [
      'Pay',
      'Payroll_Report',
      'Finance_Payslips',
      'Finance_Loans',
      'Finance_Invoices',
      'Finance_Payments',
      'Finance_Deductions'
    ]
  },
  {
    key: 'Requests',
    label: 'Requests',
    icon: ClipboardCheck,
    moduleIds: [
      'Leave',
      'Requests_Swaps',
      'Requests_Approvals'
    ]
  },
  {
    key: 'Insights',
    label: 'Insights',
    icon: BarChart,
    moduleIds: [
      'Attendance_Report',
      'Reports_Payroll',
      'Reports_Performance',
      'Reports_Compliance',
      'Docs_Contracts',
      'Docs_Uploads',
      'Docs_Compliance'
    ]
  }
];

// Industry modules are integrated under Operations; no separate industry dropdown
