import { useEffect, useState, Fragment, useRef, useCallback } from 'react';
import { format, isSameDay, isPast, isFuture, isWithinInterval, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Shift } from './scheduling/types';
import { Modal } from './Modal';
import { ManageLoginModal } from './ManageLoginModal';
import { ConfirmModal } from './ConfirmModal';
import { RequestLeaveModal } from './RequestLeaveModal';
import { AddLeaveEntitlementModal } from './AddLeaveEntitlementModal';
import { EmployeeQualificationsTab, EmployeeQualificationsTabRef } from './EmployeeQualificationsTab';
import AvailabilityModal, { AvailabilitySlotInput } from './AvailabilityModal';
import AddressAutocomplete from './ui/AddressAutocomplete';
import { 
  Eye,
  EyeOff,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Briefcase,
  Camera
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useBusiness } from '../context/business-context';
import { useAuth } from '../context/auth-context';
import { formatCurrency, formatDate, getCountryConfig } from '../lib/localization';
import { resolveFileUrl } from '../lib/file-url';

interface W2Profile {
  paySchedule: string;
  payType: string;
  rate: number;
  overtimeEligible: boolean;
  filingStatus?: string;
  taxState?: string;
  federalAllowances?: number;
  multipleJobs?: boolean;
  dependentsAmount?: number;
  otherIncome?: number;
  deductionsAmount?: number;
  additionalWithholding?: number;
  stateFilingStatus?: string;
  stateAllowances?: number;
  stateAdditionalWithholding?: number;
}

interface ContractorProfile {
  businessName?: string;
  type?: string;
  w9Confirmed: boolean;
  rate: number;
  paymentMethod?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  profileImageUrl?: string;
  phone?: string;
  address?: string;
  preferredName?: string;
  pronouns?: string;
  middleName?: string;
  dateOfBirth?: string; // ISO string
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  officialEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  hireDate?: string;
  payrollId?: string;
  workPeriod?: string;
  hoursPerPeriod?: number;
  daysPerPeriod?: number;
  stressProfile?: string;
  hourlyRate?: number;
  salary?: number;
  type?: string;
  payType?: string;
  availability?: AvailabilitySlot[];
  
  // New Fields for Dual Classification
  w2Profile?: W2Profile;
  contractorProfile?: ContractorProfile;

  // Deprecated/Legacy Fields (keep for backward compat in UI if needed)
  isAuthorizedToWork?: boolean;
  workerType?: 'W2' | 'CONTRACTOR_1099' | 'BOTH';
  ssn?: string;
  filingStatus?: string;
  taxState?: string;
  federalAllowances?: number;
  multipleJobs?: boolean;
  dependentsAmount?: number;
  otherIncome?: number;
  deductionsAmount?: number;
  additionalWithholding?: number;
  stateFilingStatus?: string;
  stateAllowances?: number;
  stateAdditionalWithholding?: number;
  contractorBusinessName?: string;
  contractorType?: string;
  w9Confirmed?: boolean;
  overtimeEligible?: boolean;
  paySchedule?: string;
}

interface LeaveBalance {
  id: string;
  leaveType: { name: string; isPaid: boolean };
  balanceHours: number;
  takenHours: number;
}

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  totalHours: number;
  leaveType: { name: string };
  reason?: string;
}
interface BasicLeaveType { id: string; name: string }

interface AvailabilitySlot {
  day: string;
  isAvailable: boolean;
  type: 'all_day' | 'specific_times';
  startTime?: string;
  endTime?: string;
  reason?: string;
}

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onUpdate: () => void;
  initialTab?: string;
  highlightQualificationId?: string;
}

type Tab = 'Personal' | 'Employment' | 'Qualifications' | 'Shifts' | 'Leave' | 'Availability' | 'News feed';

const ContentCard = ({ title, children, className = '', action }: { title?: React.ReactNode, children: React.ReactNode, className?: string, action?: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700/50 ${className}`}
  >
    {(title || action) && (
      <div className="flex justify-between items-center mb-6">
        {title && <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </motion.div>
);

const LabelValue = ({ label, value, subValue, isSensitive = false, className = '' }: { label: string, value: React.ReactNode, subValue?: React.ReactNode, isSensitive?: boolean, className?: string }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
    <div className={`font-medium text-gray-900 dark:text-white text-base ${isSensitive ? 'blur-sm hover:blur-none transition-all duration-300 cursor-pointer select-none' : ''}`}>
      {value}
    </div>
    {subValue && <div className="text-sm text-gray-500 mt-0.5">{subValue}</div>}
  </div>
);

const defaultAvailability: AvailabilitySlot[] = [
  { day: 'Monday', isAvailable: false, type: 'all_day', reason: 'Unavailable all day every week' },
  { day: 'Tuesday', isAvailable: true, type: 'all_day' },
  { day: 'Wednesday', isAvailable: true, type: 'all_day' },
  { day: 'Thursday', isAvailable: true, type: 'all_day' },
  { day: 'Friday', isAvailable: true, type: 'all_day' },
  { day: 'Saturday', isAvailable: true, type: 'all_day' },
  { day: 'Sunday', isAvailable: true, type: 'all_day' },
];

export function EmployeeProfileModal({ isOpen, onClose, employee, onUpdate, initialTab, highlightQualificationId }: EmployeeProfileModalProps) {
  const { selectedBusiness } = useBusiness();
  const { user: authUser } = useAuth();
  const locale = getCountryConfig(selectedBusiness?.country).locale;
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(employee?.profileImageUrl || null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>('Personal');
  
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab as Tab);
    } else if (isOpen && !initialTab) {
       setActiveTab('Personal');
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    setProfileImageUrl(employee?.profileImageUrl || null);
  }, [employee?.id]);

  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRequestLeaveModalOpen, setIsRequestLeaveModalOpen] = useState(false);
  const [isAddEntitlementModalOpen, setIsAddEntitlementModalOpen] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<BasicLeaveType[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [leaveDateRange, setLeaveDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [shiftStatus, setShiftStatus] = useState<{ status: string; startTime?: string } | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const [elapsedLabel, setElapsedLabel] = useState<string>('');

  const uploadProfilePhoto = async (file: File) => {
    if (!employee) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be <= 10MB');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await api.post('/uploads/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = uploadRes.data?.url as string;
      if (!url) throw new Error('Upload failed');

      const businessIdOverride = selectedBusiness?.id || (employee as any)?.businessId;
      await api.patch(
        `/employees/${employee.id}`,
        { profileImageUrl: url },
        businessIdOverride ? { headers: { 'x-business-id': businessIdOverride } } : undefined
      );
      setProfileImageUrl(url);
      toast.success('Profile photo updated');
      onUpdate();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; text: string | null; senderEmployeeId: string; senderName: string; createdAt: string }>>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatSending, setChatSending] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>('');

  const fetchShiftStatus = useCallback(async () => {
    try {
      const res = await api.get(`/time-tracking/admin/status/${employee!.id}`);
      setShiftStatus(res.data);
    } catch (e) {
      console.error('Failed to fetch shift status', e);
    }
  }, [employee]);

  const fetchShifts = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const start = startOfMonth(visibleMonth);
      const end = endOfMonth(visibleMonth);
      
      const res = await api.get('/scheduling/shifts', {
        params: {
          businessId: selectedBusiness?.id,
          start: start.toISOString(),
          end: end.toISOString(),
          employeeId: employee.id
        }
      });
      const sorted = (res.data as Shift[]).sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      setShifts(sorted);
    } catch (e) {
      console.error('Failed to fetch shifts', e);
    }
  }, [employee, visibleMonth, selectedBusiness]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data);
    } catch (e) {
      console.error('Failed to fetch locations', e);
    }
  }, []);

  const fetchLeaveData = useCallback(async () => {
    if (!employee) return;
    try {
      const [balancesRes, requestsRes] = await Promise.all([
        api.get(`/leave/balance?employeeId=${employee.id}`),
        api.get(`/leave/employee-requests?employeeId=${employee.id}`)
      ]);
      setLeaveBalances(balancesRes.data);
      setLeaveRequests(requestsRes.data);
    } catch (error) {
      console.error('Failed to fetch leave data', error);
    }
  }, [employee]);

  const fetchProfileAndTypes = useCallback(async () => {
    try {
      if (selectedBusiness?.id) {
        const typesRes = await api.get(`/leave/types/${selectedBusiness.id}`);
        setLeaveTypes(typesRes.data);
      }
    } catch (e) {
      console.error('Failed to fetch profile/types', e);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    setUserRole(authUser?.role ? String(authUser.role) : null);
  }, [authUser?.role]);

  useEffect(() => {
    if (isOpen && employee?.id) {
      fetchShiftStatus();
      fetchShifts();
    }
  }, [isOpen, employee?.id, visibleMonth, fetchShiftStatus, fetchShifts]);

  useEffect(() => {
    if (isOpen && selectedBusiness) {
      fetchLocations();
    }
  }, [isOpen, selectedBusiness, fetchLocations]);
  
  useEffect(() => {
    if (activeTab === 'Leave' && employee) {
      fetchLeaveData();
      fetchProfileAndTypes();
    }
  }, [activeTab, employee, fetchLeaveData, fetchProfileAndTypes]);

  const formatChatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const loadChatForEmployee = useCallback(async () => {
    if (!employee || activeTab !== 'News feed') return;
    if (userRole === 'SUPER_ADMIN' && !selectedBusiness?.id) return;
    try {
      setChatLoading(true);
      const threadRes = await api.post('/chats/threads/direct', { employeeId: employee.id });
      const threadId = (threadRes.data?.id as string | undefined) || null;
      if (!threadId) {
        setChatThreadId(null);
        setChatMessages([]);
        return;
      }
      setChatThreadId(threadId);
      const messagesRes = await api.get(`/chats/threads/${threadId}/messages`, { params: { take: 60 } });
      setChatMessages(Array.isArray(messagesRes.data) ? messagesRes.data : []);
      await api.post(`/chats/threads/${threadId}/read`).catch(() => null);
    } catch (e) {
      setChatThreadId(null);
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  }, [activeTab, employee, selectedBusiness?.id, userRole]);

  const refreshChat = useCallback(async () => {
    if (!chatThreadId) return;
    try {
      const messagesRes = await api.get(`/chats/threads/${chatThreadId}/messages`, { params: { take: 60 } });
      setChatMessages(Array.isArray(messagesRes.data) ? messagesRes.data : []);
      await api.post(`/chats/threads/${chatThreadId}/read`).catch(() => null);
    } catch {
    }
  }, [chatThreadId]);

  // Load direct chat when Activity Log tab is active
  useEffect(() => {
    if (!employee || activeTab !== 'News feed') return;
    loadChatForEmployee();
    const id = window.setInterval(() => {
      refreshChat();
    }, 10_000);
    return () => window.clearInterval(id);
  }, [activeTab, employee, loadChatForEmployee, refreshChat]);

  const sendMessage = async () => {
    if (!employee || !messageText.trim()) return;
    if (userRole === 'SUPER_ADMIN' && !selectedBusiness?.id) {
      toast.error('Select a business first');
      return;
    }
    try {
      setChatSending(true);
      let threadId = chatThreadId;
      if (!threadId) {
        const threadRes = await api.post('/chats/threads/direct', { employeeId: employee.id });
        threadId = (threadRes.data?.id as string | undefined) || null;
        if (!threadId) throw new Error('Thread not available');
        setChatThreadId(threadId);
      }
      const text = messageText.trim();
      setMessageText('');
      await api.post(`/chats/threads/${threadId}/messages`, { text });
      await refreshChat();
      toast.success('Message sent');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to send message');
    } finally {
      setChatSending(false);
    }
  };

  const canManageLeave = userRole === 'BUSINESS_ADMIN' || userRole === 'MANAGER' || userRole === 'SUPER_ADMIN';

  const [editLeaveModal, setEditLeaveModal] = useState<{ isOpen: boolean; request: LeaveRequest | null }>({ isOpen: false, request: null });
  const [editForm, setEditForm] = useState<{ leaveTypeId: string; startDate: string; endDate: string; reason: string }>({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const openEditLeave = (req: LeaveRequest) => {
    const currentType = leaveTypes.find(t => t.name === req.leaveType.name);
    setEditForm({
      leaveTypeId: currentType?.id || '',
      startDate: new Date(req.startDate).toISOString().split('T')[0],
      endDate: new Date(req.endDate).toISOString().split('T')[0],
      reason: req.reason || ''
    });
    setEditLeaveModal({ isOpen: true, request: req });
  };
  const saveEditLeave = async () => {
    if (!editLeaveModal.request) return;
    try {
      await api.put(`/leave/requests/${editLeaveModal.request.id}`, {
        leaveTypeId: editForm.leaveTypeId || undefined,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        reason: editForm.reason || undefined
      });
      toast.success('Leave request updated');
      setEditLeaveModal({ isOpen: false, request: null });
      fetchLeaveData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update leave request');
    }
  };
  const approveLeave = async (id: string) => {
    try {
      await api.put(`/leave/requests/${id}/status`, { status: 'APPROVED' });
      toast.success('Leave request approved');
      fetchLeaveData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; requestId: string | null; reason: string; submitting: boolean; error?: string }>({ isOpen: false, requestId: null, reason: '', submitting: false });
  const openRejectModal = (id: string) => {
    setRejectModal({ isOpen: true, requestId: id, reason: '', submitting: false, error: undefined });
  };
  const submitReject = async () => {
    if (!rejectModal.requestId) return;
    if (!rejectModal.reason.trim()) {
      setRejectModal(prev => ({ ...prev, error: 'Rejection reason is required.' }));
      return;
    }
    try {
      setRejectModal(prev => ({ ...prev, submitting: true, error: undefined }));
      await api.put(`/leave/requests/${rejectModal.requestId}/status`, { status: 'REJECTED', rejectionReason: rejectModal.reason.trim() });
      toast.success('Leave request rejected');
      setRejectModal({ isOpen: false, requestId: null, reason: '', submitting: false });
      fetchLeaveData();
    } catch (e: any) {
      setRejectModal(prev => ({ ...prev, submitting: false, error: e.response?.data?.message || 'Failed to reject' }));
    }
  };

  const qualificationsTabRef = useRef<EmployeeQualificationsTabRef>(null);

  const [editFormData, setEditFormData] = useState<Partial<Employee>>({});
  const [editSection, setEditSection] = useState<'details' | 'contact'>('details');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'primary'
  });

  const [availability, setAvailability] = useState<AvailabilitySlot[]>(employee?.availability || defaultAvailability);
  const [availabilityModal, setAvailabilityModal] = useState<{
    isOpen: boolean;
    mode: 'edit' | 'add';
    initial?: AvailabilitySlotInput;
  }>({ isOpen: false, mode: 'add' });
  const [availabilityRecords, setAvailabilityRecords] = useState<Record<string, any>>({});
  const [availabilitySaving, setAvailabilitySaving] = useState<boolean>(false);
  const [availabilityOneOffRecords, setAvailabilityOneOffRecords] = useState<any[]>([]);
  const [availabilityView, setAvailabilityView] = useState<'all' | 'weekly' | 'oneoff'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  const reloadAvailability = useCallback(async () => {
    if (!employee) return;
    const res = await api.get(`/employees/${employee.id}/availability`);
    const records = res.data as any[];
    const mapByDay: Record<string, any> = {};
    const next: AvailabilitySlot[] = defaultAvailability.map(s => {
      const key = s.day.slice(0,3).toLowerCase();
      const match = records.find(r => String(r.repeat).toUpperCase() === 'WEEKLY' && r.repeatDays && r.repeatDays.split(',').includes(key));
      if (!match) return s;
      mapByDay[key] = match;
      const startTime = match.startDate ? new Date(match.startDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : undefined;
      const endTime = match.endDate ? new Date(match.endDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : undefined;
      return { 
        day: s.day, 
        isAvailable: !!match.isAvailable, 
        type: (match.allDay ? 'all_day' : 'specific_times') as 'all_day' | 'specific_times',
        startTime,
        endTime,
        reason: match.comment 
      };
    });
    setAvailability(next);
    setAvailabilityRecords(mapByDay);
    setAvailabilityOneOffRecords(records.filter((r: any) => String(r.repeat).toUpperCase() !== 'WEEKLY'));
  }, [employee]);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!employee || activeTab !== 'Availability') return;
      try {
        await reloadAvailability();
      } catch {
        // ignore
      }
    };
    loadAvailability();
  }, [activeTab, employee, reloadAvailability]);

  const handleStartEdit = () => {
    if (employee) {
      // Deep copy and migrate legacy data if needed
      const initialData = JSON.parse(JSON.stringify(employee));
      
      // Migrate legacy W2 data if profile missing but was W2 (or generic)
      if (!initialData.w2Profile && (initialData.workerType === 'W2' || !initialData.workerType)) {
        initialData.w2Profile = {
          paySchedule: initialData.paySchedule || 'BI_WEEKLY',
          payType: initialData.payType || 'HOURLY',
          rate: initialData.hourlyRate || 0,
          overtimeEligible: initialData.overtimeEligible ?? true,
          filingStatus: initialData.filingStatus,
          taxState: initialData.taxState || 'DC',
          federalAllowances: initialData.federalAllowances,
          multipleJobs: initialData.multipleJobs,
          dependentsAmount: initialData.dependentsAmount,
          otherIncome: initialData.otherIncome,
          deductionsAmount: initialData.deductionsAmount,
          additionalWithholding: initialData.additionalWithholding,
          stateFilingStatus: initialData.stateFilingStatus,
          stateAllowances: initialData.stateAllowances,
          stateAdditionalWithholding: initialData.stateAdditionalWithholding
        };
      }

      // Migrate legacy Contractor data
      if (!initialData.contractorProfile && initialData.workerType === 'CONTRACTOR_1099') {
        initialData.contractorProfile = {
          businessName: initialData.contractorBusinessName,
          type: initialData.contractorType,
          w9Confirmed: initialData.w9Confirmed || false,
          rate: initialData.hourlyRate || 0,
          paymentMethod: 'CHECK'
        };
      }

      setEditFormData(initialData);
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditFormData({});
  };

  const handleInputChange = (field: keyof Employee, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleW2Change = (field: keyof W2Profile, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      w2Profile: {
        ...prev.w2Profile || {} as W2Profile,
        [field]: value
      } as W2Profile
    }));
  };

  const handleContractorChange = (field: keyof ContractorProfile, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      contractorProfile: {
        ...prev.contractorProfile || {} as ContractorProfile,
        [field]: value
      } as ContractorProfile
    }));
  };

  const toggleW2 = (checked: boolean) => {
    if (checked) {
      setEditFormData(prev => ({
        ...prev,
        w2Profile: prev.w2Profile || {
          paySchedule: 'BI_WEEKLY',
          payType: 'HOURLY',
          rate: 0,
          overtimeEligible: true,
          taxState: 'DC'
        } as W2Profile
      }));
    } else {
      setEditFormData(prev => {
        const { w2Profile, ...rest } = prev;
        return rest;
      });
    }
  };

  const toggleContractor = (checked: boolean) => {
    if (checked) {
      setEditFormData(prev => ({
        ...prev,
        contractorProfile: prev.contractorProfile || {
          w9Confirmed: false,
          rate: 0,
          paymentMethod: 'CHECK'
        } as ContractorProfile
      }));
    } else {
      setEditFormData(prev => {
        const { contractorProfile, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSave = async () => {
    if (!employee) return;

    // Validation
    if (editFormData.w2Profile) {
      if (!editFormData.w2Profile.payType) {
        toast.error('W-2 Profile: Pay Type is required');
        return;
      }
      // Allow 0 rate, but must be defined
      if (editFormData.w2Profile.rate === undefined || editFormData.w2Profile.rate === null) {
        toast.error('W-2 Profile: Rate is required');
        return;
      }
    }

    if (editFormData.contractorProfile) {
      if (editFormData.contractorProfile.rate === undefined || editFormData.contractorProfile.rate === null) {
        toast.error('Contractor Profile: Rate is required');
        return;
      }
    }

    try {
      // Ensure numeric values are numbers
      const businessIdOverride = selectedBusiness?.id || (employee as any)?.businessId;
      const payload: any = { ...editFormData };
      delete payload.availability;
      delete payload.availabilities;
      delete payload.department;
      delete payload.managedDepartments;
      delete payload.customRole;
      delete payload.defaultLocation;
      delete payload.supervisor;
      delete payload.supervisees;
      delete payload.business;
      delete payload.user;
      if (payload.w2Profile) {
        payload.w2Profile.rate = Number(payload.w2Profile.rate);
        if (payload.w2Profile.federalAllowances) payload.w2Profile.federalAllowances = Number(payload.w2Profile.federalAllowances);
        if (payload.w2Profile.dependentsAmount) payload.w2Profile.dependentsAmount = Number(payload.w2Profile.dependentsAmount);
        if (payload.w2Profile.otherIncome) payload.w2Profile.otherIncome = Number(payload.w2Profile.otherIncome);
        if (payload.w2Profile.deductionsAmount) payload.w2Profile.deductionsAmount = Number(payload.w2Profile.deductionsAmount);
        if (payload.w2Profile.additionalWithholding) payload.w2Profile.additionalWithholding = Number(payload.w2Profile.additionalWithholding);
        if (payload.w2Profile.stateAllowances) payload.w2Profile.stateAllowances = Number(payload.w2Profile.stateAllowances);
        if (payload.w2Profile.stateAdditionalWithholding) payload.w2Profile.stateAdditionalWithholding = Number(payload.w2Profile.stateAdditionalWithholding);
      }
      if (payload.contractorProfile) {
        payload.contractorProfile.rate = Number(payload.contractorProfile.rate);
      }

      await api.patch(`/employees/${employee.id}`, payload, businessIdOverride ? { headers: { 'x-business-id': businessIdOverride } } : undefined);
      onUpdate();
      setIsEditing(false);
      toast.success('Employee updated successfully');
    } catch (e: any) {
      console.error('Failed to update employee', e);
      toast.error(e.response?.data?.message || 'Failed to update employee');
    }
  };

  const handleDeactivate = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Deactivate Team Member',
      message: `Are you sure you want to deactivate ${employee?.firstName} ${employee?.lastName}? They will no longer be able to log in.`,
      confirmText: 'Deactivate',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (!employee) return;
          const businessIdOverride = selectedBusiness?.id || (employee as any)?.businessId;
          await api.patch(`/employees/${employee.id}`, { status: 'INACTIVE' }, businessIdOverride ? { headers: { 'x-business-id': businessIdOverride } } : undefined);
          onUpdate();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          toast.success('Employee deactivated successfully');
        } catch (e) {
          console.error('Failed to deactivate employee', e);
          toast.error('Failed to deactivate employee');
        }
      }
    });
  };

  const handleActivate = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Activate Team Member',
      message: `Are you sure you want to activate ${employee?.firstName} ${employee?.lastName}?`,
      confirmText: 'Activate',
      variant: 'primary',
      onConfirm: async () => {
        try {
          if (!employee) return;
          const businessIdOverride = selectedBusiness?.id || (employee as any)?.businessId;
          await api.patch(`/employees/${employee.id}`, { status: 'ACTIVE' }, businessIdOverride ? { headers: { 'x-business-id': businessIdOverride } } : undefined);
          onUpdate();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          toast.success('Employee activated successfully');
        } catch (e) {
          console.error('Failed to activate employee', e);
          toast.error('Failed to activate employee');
        }
      }
    });
  };

  const handleMessage = () => {
    setActiveTab('News feed');
  };

  const handleShiftAction = async () => {
    if (!employee) return;
    setShiftLoading(true);
    try {
      if (shiftStatus?.status === 'CLOCKED_IN' || shiftStatus?.status === 'ON_BREAK') {
        await api.post('/time-tracking/admin/clock-out', { 
            employeeId: employee.id
        });
        toast.success('Clocked out successfully');
      } else {
        await api.post('/time-tracking/admin/clock-in', {
          employeeId: employee.id,
          locationId: locations[0]?.id 
        });
        toast.success('Shift started successfully');
      }
      await fetchShiftStatus();
      await fetchShifts();
      onUpdate();
    } catch (e) {
      const msg = (e as any)?.response?.data?.message || 'Failed to update shift status';
      console.error('Shift action failed', e);
      toast.error(msg);
    } finally {
      setShiftLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (shiftStatus?.startTime && (shiftStatus.status === 'CLOCKED_IN' || shiftStatus.status === 'ON_BREAK')) {
      const updateTimer = () => {
        const start = new Date(shiftStatus.startTime!);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setElapsedLabel(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedLabel('');
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [shiftStatus]);

  const openEditAvailabilityModal = (slot: AvailabilitySlot) => {
    setAvailabilityModal({
      isOpen: true,
      mode: 'edit',
      initial: {
        day: slot.day,
        isAvailable: slot.isAvailable,
        startDate: (() => {
          const key = slot.day.slice(0,3).toLowerCase();
          const rec = availabilityRecords[key];
          return rec?.startDate ? new Date(rec.startDate).toISOString().slice(0,16) : new Date().toISOString().slice(0,16);
        })(),
        endDate: (() => {
          const key = slot.day.slice(0,3).toLowerCase();
          const rec = availabilityRecords[key];
          return rec?.endDate ? new Date(rec.endDate).toISOString().slice(0,16) : new Date().toISOString().slice(0,16);
        })(),
        allDay: slot.type === 'all_day',
        repeat: 'weekly',
        repeatDays: [slot.day.slice(0,3).toLowerCase()],
        endOption: 'no_end',
        comment: slot.reason
      }
    });
  };

  const openAddAvailabilityModal = () => {
    setAvailabilityModal({
      isOpen: true,
      mode: 'add'
    });
  };

  const openEditOneOffAvailability = (rec: any) => {
    setAvailabilityModal({
      isOpen: true,
      mode: 'edit',
      initial: {
        isAvailable: !!rec.isAvailable,
        startDate: new Date(rec.startDate).toISOString().slice(0,16),
        endDate: rec.endDate ? new Date(rec.endDate).toISOString().slice(0,16) : new Date(rec.startDate).toISOString().slice(0,16),
        allDay: !!rec.allDay,
        repeat: 'does_not_repeat',
        repeatDays: [],
        endOption: 'no_end',
        comment: rec.comment,
        recordId: rec.id
      }
    });
  };

  const saveAvailabilityFromModal = async (data: AvailabilitySlotInput) => {
    if (!employee) return;
    try {
      setAvailabilitySaving(true);
      const key = (data.day ? data.day.slice(0,3).toLowerCase() : (data.repeatDays?.[0] || 'mon'));
      const existing = availabilityRecords[key];
      const payload: any = {
        isAvailable: data.isAvailable,
        startDate: data.startDate,
        endDate: data.allDay ? undefined : data.endDate,
        allDay: data.allDay,
        comment: data.comment
      };
      if (data.repeat === 'weekly') {
        payload.repeat = 'WEEKLY';
        payload.repeatDays = [key];
        payload.endOption = data.endOption === 'ends_on' ? 'ENDS_ON' : 'NO_END';
        if (data.endOption === 'ends_on') {
          payload.endOn = data.endOn;
        }
      } else {
        payload.repeat = 'DOES_NOT_REPEAT';
        payload.endOption = 'NO_END';
      }
      if (data.recordId) {
        await api.patch(`/employees/${employee.id}/availability/${data.recordId}`, payload);
      } else if (existing?.id) {
        await api.patch(`/employees/${employee.id}/availability/${existing.id}`, payload);
      } else {
        await api.post(`/employees/${employee.id}/availability`, payload);
      }
      await reloadAvailability();
      setAvailabilityModal(prev => ({ ...prev, isOpen: false }));
      toast.success('Availability updated');
    } catch (e) {
      console.error('Failed to save availability', e);
      toast.error('Failed to save availability');
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const deleteAvailabilityFromModal = async () => {
    if (!employee || !availabilityModal.initial) {
      setAvailabilityModal(prev => ({ ...prev, isOpen: false }));
      return;
    }
    try {
      setAvailabilitySaving(true);
      if (availabilityModal.initial.recordId) {
        await api.delete(`/employees/${employee.id}/availability/${availabilityModal.initial.recordId}`);
      } else {
        const key = (availabilityModal.initial.day ? availabilityModal.initial.day.slice(0,3).toLowerCase() : (availabilityModal.initial.repeatDays?.[0] || 'mon'));
        const existing = availabilityRecords[key];
        if (existing?.id) {
          await api.delete(`/employees/${employee.id}/availability/${existing.id}`);
        }
      }
      await reloadAvailability();
      setAvailabilityModal(prev => ({ ...prev, isOpen: false }));
      toast.success('Availability deleted');
    } catch (e) {
      console.error('Failed to delete availability', e);
      toast.error('Failed to delete availability');
      setAvailabilityModal(prev => ({ ...prev, isOpen: false }));
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const SidebarItem = ({ tab, label }: { tab: Tab; label: string }) => (
    <motion.button
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all rounded-lg mx-2 mb-1 w-[calc(100%-16px)] ${
        activeTab === tab
          ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 dark:text-indigo-300 border-l-4 border-indigo-500'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
      }`}
    >
      {label}
    </motion.button>
  );

  if (!employee) return null;

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-7xl">
      <div className="flex h-[85vh] overflow-hidden -m-6 bg-gray-50/30 dark:bg-slate-900/30 backdrop-blur-sm">
        {/* Sidebar */}
        <div className="w-72 bg-white/80 dark:bg-slate-800/80 border-r border-gray-200 dark:border-slate-700 flex flex-col overflow-y-auto backdrop-blur-xl">
          <div className="p-8 flex flex-col items-center border-b border-gray-200 dark:border-slate-700 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-slate-800/50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-28 h-28 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-4xl font-bold text-indigo-600 dark:text-indigo-300 shadow-lg mb-4 border-4 border-white dark:border-slate-700 overflow-hidden"
            >
              {profileImageUrl ? (
                <img src={resolveFileUrl(profileImageUrl)} alt={`${employee.firstName} ${employee.lastName}`} className="w-full h-full object-cover" />
              ) : (
                <span>{(employee.firstName || '?')[0]}{(employee.lastName || '?')[0]}</span>
              )}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900"
                title="Upload photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </motion.div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadProfilePhoto(f);
              }}
            />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {employee.firstName}
            </h2>
            <p className="text-sm text-gray-500 mt-1 text-center font-medium">
              {employee.role?.replace('_', ' ')}
            </p>
            <p className="text-xs text-gray-400 mt-1 text-center">
              {shiftStatus?.status === 'CLOCKED_IN' || shiftStatus?.status === 'ON_BREAK'
                ? '🟢 Currently working'
                : shifts.some(s => {
                    const start = new Date(s.startTime);
                    const end = s.endTime ? new Date(s.endTime) : null;
                    const today = new Date();
                    return isSameDay(start, today) || (end && isWithinInterval(today, { start, end }));
                  })
                  ? '📅 Scheduled today'
                  : '⚪ No shifts today'
              }
            </p>
            
            {elapsedLabel && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 w-full rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-700 p-3 shadow-sm backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span className="text-xs font-medium">Active Shift</span>
                  </div>
                  <span className="text-sm font-bold tracking-wider font-mono">{elapsedLabel}</span>
                </div>
              </motion.div>
            )}
            
            <button 
              onClick={handleShiftAction}
              disabled={shiftLoading}
              className={`mt-6 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm transform active:scale-95 ${
                shiftStatus?.status === 'CLOCKED_IN' || shiftStatus?.status === 'ON_BREAK'
                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:shadow-md'
                  : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:shadow-md'
              } ${shiftLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {shiftLoading 
                ? 'Processing...' 
                : (shiftStatus?.status === 'CLOCKED_IN' || shiftStatus?.status === 'ON_BREAK' ? 'Clock Out' : 'Start Shift')
              }
            </button>
          </div>

          <div className="p-4 space-y-8 flex-1">
            <div>
              <h3 className="px-6 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Profile
              </h3>
              <div className="space-y-1">
                <SidebarItem tab="Personal" label="Personal Details" />
                <SidebarItem tab="Employment" label="Employment Info" />
                <SidebarItem tab="Qualifications" label="Qualifications" />
              </div>
            </div>

            <div>
              <h3 className="px-6 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Scheduling
              </h3>
              <div className="space-y-1">
                <SidebarItem tab="Shifts" label="Shift History" />
                <SidebarItem tab="Leave" label="Leave & Time Off" />
                <SidebarItem tab="Availability" label="Availability" />
              </div>
            </div>

            <div>
              <h3 className="px-6 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Activity
              </h3>
              <div className="space-y-1">
                <SidebarItem tab="News feed" label="Activity Log" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gray-50/50 dark:bg-slate-900/50 overflow-y-auto relative">
          <div className="p-10 max-w-5xl mx-auto pb-20">
            {/* Header with Close Button */}
            <div className="flex justify-between items-start mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {activeTab}
              </h1>
              <div className="flex items-center gap-4">
                {!isEditing && (activeTab === 'Personal' || activeTab === 'Employment') && (
                  <button 
                    onClick={handleStartEdit}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                )}
                {activeTab === 'Availability' && (
                  <button 
                    onClick={() => openAddAvailabilityModal()}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add availability
                  </button>
                )}
                {activeTab === 'Leave' && (
                  <button 
                    onClick={() => setIsRequestLeaveModalOpen(true)}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add leave request
                  </button>
                )}
              </div>
            </div>

            {activeTab === 'Qualifications' && (
              <ContentCard
                title="Qualifications & Certifications"
                action={
                  <button
                    onClick={() => qualificationsTabRef.current?.openAddModal()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <span className="text-lg leading-none">+</span>
                    Add Qualification
                  </button>
                }
              >
                <EmployeeQualificationsTab 
                  ref={qualificationsTabRef}
                  employeeId={employee.id} 
                  highlightId={highlightQualificationId}
                  hideHeader
                  className="p-0"
                />
              </ContentCard>
            )}

            {activeTab === 'Personal' && (
              <div className="space-y-6">
                {!isEditing ? (
                  <>
                    {/* Quick Actions */}
                    <ContentCard className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">Quick Actions</h3>
                          <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80">Manage account settings and access</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button 
                            onClick={handleMessage}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all border border-indigo-100 dark:border-slate-700"
                          >
                            Message
                          </button>
                          <button 
                            onClick={() => setIsLoginModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all border border-indigo-100 dark:border-slate-700"
                          >
                            Update password
                          </button>
                          {employee.status === 'INACTIVE' ? (
                            <button 
                              onClick={handleActivate}
                              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md hover:bg-green-600 transition-all"
                            >
                              Activate employee
                            </button>
                          ) : (
                            <button 
                              onClick={handleDeactivate}
                              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Deactivate team member
                            </button>
                          )}
                        </div>
                      </div>
                    </ContentCard>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Personal Details View */}
                      <ContentCard title="Personal Details">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                          <LabelValue label="Name" value={`${employee.firstName} ${employee.middleName} ${employee.lastName}`} />
                          <LabelValue label="Preferred name" value={employee.preferredName || employee.firstName} />
                          <LabelValue label="Pronouns" value={employee.pronouns || 'Not Specified'} />
                          <LabelValue 
                            label="Date of birth" 
                            value={employee.dateOfBirth ? formatDate(employee.dateOfBirth, selectedBusiness?.country) : 'Not set'} 
                            subValue={!employee.dateOfBirth && <button onClick={handleStartEdit} className="text-indigo-600 hover:underline text-xs font-medium">Add date</button>}
                          />
                          <LabelValue 
                            label="SSN / ITIN" 
                            value={employee.ssn ? `***-**-${employee.ssn.slice(-4)}` : 'Not set'} 
                            isSensitive={true}
                          />
                          <LabelValue 
                            label="Work Authorization" 
                            value={employee.isAuthorizedToWork ? 'Authorized' : 'Not Authorized'} 
                            className="text-green-600 dark:text-green-400"
                          />
                        </div>
                      </ContentCard>

                      {/* Contact View */}
                      <ContentCard title="Contact Information">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                          <LabelValue 
                            label="Email" 
                            value={<a href={`mailto:${employee.email}`} className="text-indigo-600 hover:underline break-all">{employee.email}</a>} 
                          />
                          <LabelValue 
                            label="Official Email" 
                            value={employee.officialEmail ? <a href={`mailto:${employee.officialEmail}`} className="text-indigo-600 hover:underline break-all">{employee.officialEmail}</a> : 'Not Specified'} 
                          />
                          <LabelValue label="Mobile" value={employee.phone || 'Not Specified'} />
                          <LabelValue 
                            label="Address" 
                            value={employee.address ? [employee.address, employee.city, employee.state, employee.zip, employee.country].filter(Boolean).join(', ') : 'Not set'}
                            subValue={!employee.address && <button onClick={handleStartEdit} className="text-indigo-600 hover:underline text-xs font-medium">Add address</button>}
                          />
                          <div className="col-span-1 sm:col-span-2 pt-4 border-t border-gray-100 dark:border-slate-700/50">
                             <LabelValue 
                                label="Emergency contact" 
                                value={employee.emergencyContactName ? `${employee.emergencyContactName} ${employee.emergencyContactPhone ? `(${employee.emergencyContactPhone})` : ''}` : 'Not set'}
                                subValue={!employee.emergencyContactName && <button onClick={handleStartEdit} className="text-indigo-600 hover:underline text-xs font-medium">Add contact</button>}
                             />
                          </div>
                        </div>
                      </ContentCard>
                    </div>

                    {/* Other View */}
                    <ContentCard title="System & Security">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <LabelValue label="Kiosk PIN" value="••••" subValue={<button className="text-indigo-600 hover:underline text-xs font-medium">Show</button>} />
                        <LabelValue label="Login username" value={<span className="break-all">{employee.email.split('@')[0]}</span>} />
                        <LabelValue label="Device" value="Not installed" className="text-gray-500" />
                        <LabelValue label="2FA" value="Not set up" className="text-gray-500" />
                      </div>
                    </ContentCard>
                  </>
                ) : (
                  <ContentCard>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4">
                           <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</h3>
                           <div className="flex gap-2">
                              <button 
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${editSection === 'details' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700/50'}`}
                                onClick={() => setEditSection('details')}
                              >
                                Personal Details
                              </button>
                              <button 
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${editSection === 'contact' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700/50'}`}
                                onClick={() => setEditSection('contact')}
                              >
                                Contact Information
                              </button>
                           </div>
                        </div>

                    {editSection === 'details' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                          <input 
                            type="text" 
                            value={editFormData.firstName || ''} 
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Middle Name</label>
                          <input 
                            type="text" 
                            value={editFormData.middleName || ''} 
                            onChange={(e) => handleInputChange('middleName', e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                          <input 
                            type="text" 
                            value={editFormData.lastName || ''} 
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Name</label>
                          <input 
                            type="text" 
                            value={editFormData.preferredName || ''} 
                            onChange={(e) => handleInputChange('preferredName', e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pronouns</label>
                          <select
                            value={editFormData.pronouns || ''} 
                            onChange={(e) => handleInputChange('pronouns', e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                          >
                            <option value="">Select Pronouns</option>
                            <option value="He/Him">He/Him</option>
                            <option value="She/Her">She/Her</option>
                            <option value="They/Them">They/Them</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                          <input 
                            type="date" 
                            value={editFormData.dateOfBirth ? new Date(editFormData.dateOfBirth).toISOString().split('T')[0] : ''} 
                            onChange={(e) => handleInputChange('dateOfBirth', e.target.value ? new Date(e.target.value).toISOString() : '')}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SSN / ITIN</label>
                          <input 
                            type="text" 
                            placeholder="XXX-XX-XXXX"
                            value={editFormData.ssn || ''} 
                            onChange={(e) => handleInputChange('ssn', e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                          />
                        </div>
                        <div className="flex items-center pt-8">
                          <input
                            type="checkbox"
                            id="isAuthorizedToWork"
                            checked={editFormData.isAuthorizedToWork ?? true}
                            onChange={(e) => handleInputChange('isAuthorizedToWork', e.target.checked)}
                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor="isAuthorizedToWork" className="ml-3 block text-sm font-medium text-gray-900 dark:text-white">
                            Authorized to work in US
                          </label>
                        </div>
                      </div>
                    )}

                    {editSection === 'contact' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                              <input 
                                type="email" 
                                value={editFormData.email || ''} 
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Official Email</label>
                              <input 
                                type="email" 
                                value={editFormData.officialEmail || ''} 
                                onChange={(e) => handleInputChange('officialEmail', e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                              <input 
                                type="tel" 
                                value={editFormData.phone || ''} 
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                              />
                           </div>
                        </div>
                        
                        <div className="pt-6 border-t border-gray-200 dark:border-slate-700">
                           <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Address</h4>
                           <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
                                <AddressAutocomplete
                                  value={editFormData.address || ''}
                                  onChange={(val) => handleInputChange('address', val)}
                                  onSelect={(data) => {
                                    setEditFormData(prev => ({
                                      ...prev,
                                      address: data.street || data.address.split(',')[0],
                                      city: data.city,
                                      state: data.state,
                                      zip: data.zip,
                                      country: data.country,
                                      taxState: data.state // Auto-detect tax state from address
                                    }));
                                  }}
                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.city || ''} 
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.state || ''} 
                                    onChange={(e) => handleInputChange('state', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zip Code</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.zip || ''} 
                                    onChange={(e) => handleInputChange('zip', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.country || ''} 
                                    onChange={(e) => handleInputChange('country', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                  />
                                </div>
                              </div>
                           </div>
                        </div>

                        <div className="pt-6 border-t border-gray-200 dark:border-slate-700">
                           <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Emergency Contact</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                <input 
                                  type="text" 
                                  value={editFormData.emergencyContactName || ''} 
                                  onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                                <input 
                                  type="tel" 
                                  value={editFormData.emergencyContactPhone || ''} 
                                  onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                />
                              </div>
                           </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-slate-700">
                       <button 
                         onClick={handleCancel}
                         className="px-6 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-600 transition-all"
                       >
                         Cancel
                       </button>
                       <button 
                         onClick={handleSave}
                         className="px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                       >
                         Save Changes
                       </button>
                    </div>
                  </div>
                </ContentCard>
                )}
              </div>
            )}
            
            {activeTab === 'Employment' && (
              <div className="space-y-6 relative">
                {!isEditing ? (
                  <>
                    {/* Work details */}
                    <ContentCard title="Work details">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <LabelValue 
                          label="Deputy access level" 
                          value={employee.role === 'BUSINESS_ADMIN' ? 'System Administrator' : 
                                 employee.role === 'SUPER_ADMIN' ? 'System Administrator' : 
                                 employee.role.charAt(0) + employee.role.slice(1).toLowerCase().replace('_', ' ')}
                        />
                        <LabelValue label="Works at" value="Igwe Scissors" />
                        <LabelValue 
                          label="Hired on" 
                          value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'Not set'}
                        />
                        <LabelValue 
                          label="Training" 
                          value="None" 
                          subValue={<button className="text-indigo-600 hover:underline text-xs font-medium">Add training</button>}
                        />
                      </div>
                    </ContentCard>

                    {/* Pay & Tax details */}
                    <ContentCard 
                      title="Pay & Tax details"
                      action={
                        <button 
                          onClick={() => setShowSensitiveData(!showSensitiveData)}
                          className="flex items-center gap-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors uppercase tracking-wide"
                        >
                          {showSensitiveData ? 'Hide sensitive data' : 'View sensitive data'}
                          {showSensitiveData ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      }
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <LabelValue 
                          label="Active Roles" 
                          value={[
                             (employee.w2Profile || employee.workerType === 'W2') && 'W-2 Employee',
                             (employee.contractorProfile || employee.workerType === 'CONTRACTOR_1099') && '1099 Contractor'
                           ].filter(Boolean).join(', ') || 'None'}
                        />
                        <LabelValue 
                          label="Employment type" 
                          value={employee.type || 'Not set'} 
                          isSensitive={true}
                        />
                        <LabelValue 
                          label="Payroll ID" 
                          value={employee.payrollId || 'Not set'}
                          subValue={!employee.payrollId && <button onClick={handleStartEdit} className="text-indigo-600 hover:underline text-xs font-medium">Add ID</button>}
                          isSensitive={true}
                        />
                        <LabelValue 
                          label="Pay rate (Default)" 
                          value={
                               employee.w2Profile?.rate 
                                 ? `${formatCurrency(Number(employee.w2Profile.rate), selectedBusiness?.currencyCode)}/${employee.w2Profile.payType === 'SALARY' ? 'yr' : 'hr'}`
                                 : employee.hourlyRate ? `${formatCurrency(Number(employee.hourlyRate), selectedBusiness?.currencyCode)}/hr` : 'Not set'
                           }
                           isSensitive={true}
                        />
                      </div>

                      {/* W-2 Section */}
                      {(employee.w2Profile || employee.workerType === 'W2') && (
                        <div className={`pt-6 border-t border-gray-100 dark:border-slate-700/50 ${showSensitiveData ? '' : 'blur-sm select-none'}`}>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            W-2 Tax Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <LabelValue label="Filing Status" value={employee.w2Profile?.filingStatus || employee.filingStatus || 'Not set'} />
                            <LabelValue label="Tax State" value={employee.w2Profile?.taxState || employee.taxState || 'DC'} />
                            <LabelValue 
                              label="Allowances" 
                              value={
                                <div className="flex flex-col gap-1">
                                  <span>Fed: {employee.w2Profile?.federalAllowances ?? employee.federalAllowances ?? 0}</span>
                                  <span>State: {employee.w2Profile?.stateAllowances ?? employee.stateAllowances ?? 0}</span>
                                </div>
                              } 
                            />
                          </div>
                        </div>
                      )}

                      {/* Contractor Section */}
                      {(employee.contractorProfile || employee.workerType === 'CONTRACTOR_1099') && (
                        <div className={`pt-6 mt-6 border-t border-gray-100 dark:border-slate-700/50 ${showSensitiveData ? '' : 'blur-sm select-none'}`}>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            1099 Contractor Details
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <LabelValue label="Business Name" value={employee.contractorProfile?.businessName || employee.contractorBusinessName || 'N/A'} />
                            <LabelValue label="Type" value={employee.contractorProfile?.type || employee.contractorType || 'Individual'} />
                            <LabelValue 
                              label="W-9 Status" 
                              value={
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  (employee.contractorProfile?.w9Confirmed ?? employee.w9Confirmed) 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                  {(employee.contractorProfile?.w9Confirmed ?? employee.w9Confirmed) ? 'Confirmed' : 'Pending'}
                                </span>
                              } 
                            />
                          </div>
                        </div>
                      )}
                    </ContentCard>

                    {/* Regular working hours */}
                    <ContentCard title="Regular working hours">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <LabelValue 
                          label="Work period" 
                          value={employee.workPeriod || 'Not set'}
                          subValue={!employee.workPeriod && <button onClick={handleStartEdit} className="text-indigo-600 hover:underline text-xs font-medium">Set period</button>}
                        />
                        <LabelValue 
                          label="Hours per period" 
                          value={employee.hoursPerPeriod || 'Not set'}
                          subValue={!employee.hoursPerPeriod && <button onClick={handleStartEdit} className="text-indigo-600 hover:underline text-xs font-medium">Set hours</button>}
                        />
                        <LabelValue 
                          label="Days per period" 
                          value={employee.daysPerPeriod || 'Not set'}
                          subValue={!employee.daysPerPeriod && <button onClick={handleStartEdit} className="text-indigo-600 hover:underline text-xs font-medium">Set days</button>}
                        />
                        <LabelValue label="Stress profile" value={employee.stressProfile || '24/7'} />
                      </div>
                    </ContentCard>

                    {/* Leave entitlements */}
                    <ContentCard title="Leave entitlements">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700/50">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Standard Entitlements</h4>
                            <p className="text-sm text-gray-500">Default leave policies apply</p>
                          </div>
                          <button className="text-indigo-600 hover:underline text-sm font-medium">Manage</button>
                        </div>
                    </ContentCard>
                  </>
                ) : (
                  <ContentCard>
                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Employment Details</h3>
                      </div>

                      {/* Edit Work Details */}
                      <section className="animate-in fade-in slide-in-from-right-4 duration-200">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Work Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                             <select
                               value={editFormData.role || ''}
                               onChange={(e) => handleInputChange('role', e.target.value)}
                               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                             >
                               <option value="EMPLOYEE">Employee</option>
                               <option value="MANAGER">Manager</option>
                               <option value="BUSINESS_ADMIN">System Administrator</option>
                             </select>
                          </div>
                          <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hire Date</label>
                             <input 
                               type="date" 
                               value={editFormData.hireDate ? new Date(editFormData.hireDate).toISOString().split('T')[0] : ''} 
                               onChange={(e) => handleInputChange('hireDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                             />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employment Type</label>
                              {(() => {
                                const currentType = String(editFormData.type || employee?.type || '').toUpperCase();
                                const isOnboarding = currentType === 'ONBOARDING';
                                const canPromote = userRole === 'SUPER_ADMIN';
                                const disabled = isOnboarding && !canPromote;
                                return (
                              <select
                                value={editFormData.type || ''}
                                onChange={(e) => handleInputChange('type', e.target.value)}
                                disabled={disabled}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                              >
                                {isOnboarding ? (
                                  <>
                                    <option value="ONBOARDING" disabled>
                                      Onboarding
                                    </option>
                                    <option value="FULL_TIME">Full Time</option>
                                    <option value="PART_TIME">Part Time</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="">Select Type</option>
                                    <option value="FULL_TIME">Full Time</option>
                                    <option value="PART_TIME">Part Time</option>
                                    <option value="CASUAL">Casual</option>
                                    <option value="CONTRACT">Contract</option>
                                  </>
                                )}
                              </select>
                                );
                              })()}
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payroll ID</label>
                              <input 
                                type="text" 
                                value={editFormData.payrollId || ''} 
                                onChange={(e) => handleInputChange('payrollId', e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                              />
                           </div>
                           <div className="flex items-center pt-8">
                              <input
                                type="checkbox"
                                id="overtimeEligibleEmployment"
                                checked={editFormData.overtimeEligible ?? true}
                                onChange={(e) => handleInputChange('overtimeEligible', e.target.checked)}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                              />
                              <label htmlFor="overtimeEligibleEmployment" className="ml-3 block text-sm font-medium text-gray-900 dark:text-white">
                                Eligible for Overtime
                              </label>
                           </div>
                        </div>
                      </section>

                      {/* Edit Worker Classification & Tax Info */}
                      <section className="animate-in fade-in slide-in-from-right-4 duration-200 delay-75">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Worker Classification</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Worker Type</label>
                              <select
                                value={editFormData.workerType || 'W2'}
                                onChange={(e) => handleInputChange('workerType', e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                              >
                                <option value="W2">W-2 Employee</option>
                                <option value="CONTRACTOR_1099">1099 Contractor</option>
                                <option value="BOTH">Both (W-2 & 1099)</option>
                              </select>
                           </div>
                         </div>

                         {(editFormData.workerType === 'W2' || editFormData.workerType === 'BOTH') && (
                           <div className="space-y-6 bg-gray-50 dark:bg-slate-800/50 p-6 rounded-xl border border-gray-100 dark:border-slate-700/50">
                             <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                               <Briefcase className="w-4 h-4 text-indigo-500" />
                               Federal Tax Information (W-4)
                             </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filing Status</label>
                                 <select
                                   value={editFormData.filingStatus || ''}
                                   onChange={(e) => handleInputChange('filingStatus', e.target.value)}
                                   className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                 >
                                   <option value="">Select Status</option>
                                   <option value="SINGLE">Single or Married Filing Separately</option>
                                   <option value="MARRIED_JOINT">Married Filing Jointly</option>
                                   <option value="HEAD_OF_HOUSEHOLD">Head of Household</option>
                                 </select>
                              </div>
                              <div className="flex items-center pt-8">
                                <input
                                  type="checkbox"
                                  id="multipleJobs"
                                  checked={editFormData.multipleJobs || false}
                                  onChange={(e) => handleInputChange('multipleJobs', e.target.checked)}
                                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                                />
                                <label htmlFor="multipleJobs" className="ml-3 block text-sm font-medium text-gray-900 dark:text-white">
                                  Multiple Jobs or Spouse Works
                                </label>
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dependents Amount ($)</label>
                                 <input 
                                   type="number" 
                                   value={editFormData.dependentsAmount || 0} 
                                   onChange={(e) => handleInputChange('dependentsAmount', parseFloat(e.target.value))}
                                   className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                 />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Other Income ($)</label>
                                 <input 
                                   type="number" 
                                   value={editFormData.otherIncome || 0} 
                                   onChange={(e) => handleInputChange('otherIncome', parseFloat(e.target.value))}
                                   className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                 />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deductions ($)</label>
                                 <input 
                                   type="number" 
                                   value={editFormData.deductionsAmount || 0} 
                                   onChange={(e) => handleInputChange('deductionsAmount', parseFloat(e.target.value))}
                                   className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                 />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Extra Withholding ($)</label>
                                 <input 
                                   type="number" 
                                   value={editFormData.additionalWithholding || 0} 
                                   onChange={(e) => handleInputChange('additionalWithholding', parseFloat(e.target.value))}
                                   className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                 />
                              </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-slate-700/50">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">State Tax Information</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax State</label>
                                   <input 
                                     type="text" 
                                     value={editFormData.taxState || 'DC'} 
                                     onChange={(e) => handleInputChange('taxState', e.target.value)}
                                     className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                   />
                                 </div>
                                 <div>
                                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State Filing Status</label>
                                   <input 
                                     type="text" 
                                     value={editFormData.stateFilingStatus || ''} 
                                     onChange={(e) => handleInputChange('stateFilingStatus', e.target.value)}
                                     className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                   />
                                 </div>
                              </div>
                            </div>
                          </div>
                         )}

                         {(editFormData.workerType === 'CONTRACTOR_1099' || editFormData.workerType === 'BOTH') && (
                           <div className="space-y-6 bg-gray-50 dark:bg-slate-800/50 p-6 rounded-xl border border-gray-100 dark:border-slate-700/50">
                             <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                               <Briefcase className="w-4 h-4 text-indigo-500" />
                               Contractor Details
                             </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name (if applicable)</label>
                                 <input 
                                   type="text" 
                                   value={editFormData.contractorBusinessName || ''} 
                                   onChange={(e) => handleInputChange('contractorBusinessName', e.target.value)}
                                   className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                 />
                               </div>
                               <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                                 <select
                                   value={editFormData.contractorType || ''}
                                   onChange={(e) => handleInputChange('contractorType', e.target.value)}
                                   className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                 >
                                   <option value="">Select Type</option>
                                   <option value="INDIVIDUAL">Individual / Sole Proprietor</option>
                                   <option value="LLC">LLC</option>
                                   <option value="CORPORATION">Corporation</option>
                                 </select>
                               </div>
                               <div className="flex items-center pt-8">
                                <input
                                  type="checkbox"
                                  id="w9Confirmed"
                                  checked={editFormData.w9Confirmed || false}
                                  onChange={(e) => handleInputChange('w9Confirmed', e.target.checked)}
                                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                                />
                                <label htmlFor="w9Confirmed" className="ml-3 block text-sm font-medium text-gray-900 dark:text-white">
                                  W-9 Form Confirmed
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </section>

                      {/* Edit Pay Details */}
                      <section className="animate-in fade-in slide-in-from-right-4 duration-200 delay-100">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Pay Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pay Type</label>
                              <select
                                value={editFormData.payType || ''}
                                onChange={(e) => handleInputChange('payType', e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                              >
                                <option value="HOURLY">Hourly</option>
                                <option value="SALARY">Salary</option>
                              </select>
                           </div>
                           {editFormData.payType === 'HOURLY' && (
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hourly Rate</label>
                                <input 
                                  type="number" 
                                  value={editFormData.hourlyRate || ''} 
                                  onChange={(e) => handleInputChange('hourlyRate', parseFloat(e.target.value))}
                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                />
                             </div>
                           )}
                           {editFormData.payType === 'SALARY' && (
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Annual Salary</label>
                                <input 
                                  type="number" 
                                  value={editFormData.salary || ''} 
                                  onChange={(e) => handleInputChange('salary', parseFloat(e.target.value))}
                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm px-4 py-2.5 border transition-colors"
                                />
                             </div>
                           )}
                           <div className="flex items-center pt-8">
                              <input
                                type="checkbox"
                                id="overtimeEligible"
                                checked={editFormData.overtimeEligible ?? true}
                                onChange={(e) => handleInputChange('overtimeEligible', e.target.checked)}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                              />
                              <label htmlFor="overtimeEligible" className="ml-3 block text-sm font-medium text-gray-900 dark:text-white">
                                Eligible for Overtime
                              </label>
                           </div>
                        </div>
                      </section>

                      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-slate-700">
                         <button 
                           onClick={handleCancel}
                           className="px-6 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-600 transition-all"
                         >
                           Cancel
                         </button>
                         <button 
                           onClick={handleSave}
                           className="px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                         >
                           Save Changes
                         </button>
                      </div>
                    </div>
                  </ContentCard>
                )}
              </div>
            )}

            {activeTab === 'Shifts' && (
              <ContentCard
                title={
                  <div className="flex flex-col">
                    <span>Scheduled Shifts</span>
                    <span className="text-sm font-normal text-gray-500">{format(visibleMonth, 'MMMM yyyy')}</span>
                  </div>
                }
                action={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVisibleMonth(prev => addMonths(prev, -1))}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                      title="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={() => setVisibleMonth(new Date())}
                      className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-xs font-medium text-gray-700 dark:text-gray-200"
                      title="Jump to current month"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setVisibleMonth(prev => addMonths(prev, 1))}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                      title="Next month"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="ml-2 flex items-center gap-2 hidden sm:flex">
                      <select
                        value={visibleMonth.getMonth()}
                        onChange={(e) => {
                          const m = parseInt(e.target.value, 10);
                          const y = visibleMonth.getFullYear();
                          setVisibleMonth(new Date(y, m, 1));
                        }}
                        className="text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                        title="Select month"
                      >
                        {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => (
                          <option key={m} value={m}>{format(new Date(2000, m, 1), 'MMM')}</option>
                        ))}
                      </select>
                      <select
                        value={visibleMonth.getFullYear()}
                        onChange={(e) => {
                          const y = parseInt(e.target.value, 10);
                          const m = visibleMonth.getMonth();
                          setVisibleMonth(new Date(y, m, 1));
                        }}
                        className="text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                        title="Select year"
                      >
                        {Array.from({ length: 41 }).map((_, i) => {
                          const base = new Date().getFullYear();
                          const year = base - 20 + i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                }
              >
                {shifts.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50/50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                    <Calendar className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No shifts found</h3>
                    <p className="mt-1 text-sm text-gray-500">There are no shifts scheduled for this employee in the selected range.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shifts.map((shift) => {
                      const start = new Date(shift.startTime);
                      const end = shift.endTime ? new Date(shift.endTime) : null;
                      const isToday = isSameDay(start, new Date());
                      const isUpcoming = isFuture(start);
                      const isInProgress = end ? isWithinInterval(new Date(), { start, end }) : (isPast(start) && !shift.endTime);
                      
                      return (
                        <motion.div 
                          key={shift.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-4">
                              <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border transition-colors ${
                                isToday 
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-900/50 dark:text-indigo-300' 
                                  : 'bg-gray-50 border-gray-100 text-gray-700 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300'
                              }`}>
                                <span className="text-xs font-bold uppercase">{format(start, 'MMM')}</span>
                                <span className="text-xl font-bold">{format(start, 'd')}</span>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                    {format(start, 'EEEE')}
                                  </h4>
                                  {isToday && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                                      Today
                                    </span>
                                  )}
                                  {isInProgress && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 animate-pulse">
                                      In Progress
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-gray-400" />
                                    <span>
                                      {format(start, 'h:mm a')} - {end ? format(end, 'h:mm a') : 'Open-ended'}
                                      {end && <span className="text-xs text-gray-400 ml-1">({((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1)} hrs)</span>}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-gray-400" />
                                    <span>{shift.location?.name || 'No Location'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className={`text-sm font-medium ${
                                isInProgress ? 'text-green-600 dark:text-green-400' : isUpcoming ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
                              }`}>
                                {isInProgress ? 'Working now' : isUpcoming ? 'Upcoming' : 'Completed'}
                              </div>
                              {shift.employee?.role && (
                                <div className="mt-1 text-xs text-gray-400">
                                  {shift.employee.role.replace('_', ' ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </ContentCard>
            )}

            {activeTab === 'Leave' && (
               <div className="space-y-6">
                  {/* Leave Balances */}
                  <ContentCard 
                    title="Leave Balances"
                    action={
                      <button 
                        onClick={() => setIsAddEntitlementModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <span className="text-lg leading-none">+</span>
                        Add Entitlement
                      </button>
                    }
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {leaveBalances.map(balance => (
                         <div key={balance.id} className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-xl border border-gray-100 dark:border-slate-700/50 hover:shadow-sm transition-all">
                            <div className="flex justify-between items-start mb-3">
                               <h4 className="font-semibold text-gray-900 dark:text-white">{balance.leaveType.name}</h4>
                               {balance.leaveType.isPaid && (
                                 <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2.5 py-1 rounded-full font-medium">Paid</span>
                               )}
                            </div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                               {balance.balanceHours} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">hrs</span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></div>
                               {balance.takenHours} hours taken
                            </div>
                         </div>
                       ))}
                    </div>
                  </ContentCard>

                {/* Leave Requests */}
                <ContentCard 
                  title="Leave Requests"
                  action={
                    <div className="flex gap-3 items-center">
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Range</span>
                          <input
                            type="date"
                            value={leaveDateRange.from}
                            onChange={(e) => setLeaveDateRange(prev => ({ ...prev, from: e.target.value }))}
                            className="w-[110px] text-sm bg-transparent border-none p-0 focus:ring-0 text-gray-900 dark:text-white"
                          />
                          <span className="text-xs text-gray-400">-</span>
                          <input
                            type="date"
                            value={leaveDateRange.to}
                            onChange={(e) => setLeaveDateRange(prev => ({ ...prev, to: e.target.value }))}
                            className="w-[110px] text-sm bg-transparent border-none p-0 focus:ring-0 text-gray-900 dark:text-white"
                          />
                          {(leaveDateRange.from || leaveDateRange.to) && (
                            <button
                              onClick={() => setLeaveDateRange({ from: '', to: '' })}
                              className="ml-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <select
                          value={leaveStatusFilter}
                          onChange={(e) => setLeaveStatusFilter(e.target.value as any)}
                          className="text-sm border-gray-200 dark:border-slate-700 rounded-lg shadow-sm dark:bg-slate-800 dark:text-white px-3 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="all">All Statuses</option>
                          <option value="PENDING">Pending</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                  }
                >     
                      {canManageLeave && (
                        <div className="flex justify-end gap-2 mb-4">
                          <button
                            onClick={() => tableScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                            aria-label="Scroll left"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={() => tableScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                            aria-label="Scroll right"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                      
                       <div ref={tableScrollRef} className="relative rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="min-w-[1000px] divide-y divide-gray-100 dark:divide-slate-700">
                             <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                                <tr>
                                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dates</th>
                                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                             </thead>
                             <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-700">
                                {leaveRequests.length === 0 ? (
                                  <tr>
                                     <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No leave requests found
                                     </td>
                                  </tr>
                                ) : (
                                  Object.entries(
                                    (
                                      (leaveStatusFilter === 'all' ? leaveRequests : leaveRequests.filter(r => r.status === leaveStatusFilter))
                                        .filter(req => {
                                          const from = leaveDateRange.from ? new Date(leaveDateRange.from) : null;
                                          const to = leaveDateRange.to ? new Date(leaveDateRange.to) : null;
                                          if (!from && !to) return true;
                                          const start = new Date(req.startDate);
                                          const end = new Date(req.endDate);
                                          const withFrom = from ? end >= from : true;
                                          const withTo = to ? start <= to : true;
                                          return withFrom && withTo;
                                        })
                                    ).reduce((acc: Record<string, LeaveRequest[]>, req) => {
                                      const key = new Date(req.startDate).toISOString().slice(0, 7);
                                      if (!acc[key]) acc[key] = [];
                                      acc[key].push(req);
                                      return acc;
                                    }, {})
                                  )
                                  .sort((a, b) => a[0] < b[0] ? 1 : -1)
                                  .map(([key, items]) => {
                                    const [year, month] = key.split('-');
                                    const d = new Date(Number(year), Number(month) - 1, 1);
                                    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                    const sortedItems = items.sort((x, y) => new Date(x.startDate).getTime() - new Date(y.startDate).getTime());
                                    return (
                                      <Fragment key={key}>
                                        <tr>
                                          <td colSpan={6} className="px-6 py-3 bg-gray-50/50 dark:bg-slate-800/50 text-xs font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700">
                                            {label}
                                          </td>
                                        </tr>
                                        {sortedItems.map(request => (
                                          <tr key={request.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                              {request.leaveType.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                              {formatDate(request.startDate, selectedBusiness?.country)} - {formatDate(request.endDate, selectedBusiness?.country)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                              {request.totalHours} hrs
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                              <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${request.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                                  request.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                                                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
                                              </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                              {request.reason || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                              {canManageLeave ? (
                                                <div className="flex items-center gap-2">
                                                  {request.status === 'PENDING' && (
                                                    <>
                                                      <button onClick={() => approveLeave(request.id)} className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm">Approve</button>
                                                      <button onClick={() => openRejectModal(request.id)} className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-100 transition-colors shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-red-900/20">Decline</button>
                                                      <button onClick={() => openEditLeave(request)} className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700/50">Edit</button>
                                                    </>
                                                  )}
                                                  {request.status !== 'PENDING' && (
                                                    <span className="text-xs text-gray-400">-</span>
                                                  )}
                                                </div>
                                              ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </Fragment>
                                    );
                                  })
                                )}
                             </tbody>
                          </table>
                          </div>
                       </div>
                </ContentCard>
               </div>
            )}

            {activeTab === 'Availability' && (
              <ContentCard
                title="Availability"
                action={
                  <button
                    onClick={openAddAvailabilityModal}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <span className="text-lg leading-none">+</span>
                    Add Availability
                  </button>
                }
              >
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex rounded-lg bg-gray-100 dark:bg-slate-800 p-1">
                      <button
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${availabilityView === 'all' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        onClick={() => setAvailabilityView('all')}
                      >
                        All
                      </button>
                      <button
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${availabilityView === 'weekly' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        onClick={() => setAvailabilityView('weekly')}
                      >
                        Weekly
                      </button>
                      <button
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${availabilityView === 'oneoff' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        onClick={() => setAvailabilityView('oneoff')}
                      >
                        One-off
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filter</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="text-sm border-gray-200 dark:border-slate-700 rounded-lg shadow-sm dark:bg-slate-800 dark:text-white px-3 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </div>
                  </div>

                  <AvailabilityModal
                    isOpen={availabilityModal.isOpen}
                    onClose={() => setAvailabilityModal({ ...availabilityModal, isOpen: false })}
                    onSave={saveAvailabilityFromModal}
                    onDelete={deleteAvailabilityFromModal}
                    saving={availabilitySaving}
                    initial={availabilityModal.initial}
                    mode={availabilityModal.mode}
                    employeeName={`${employee.firstName} ${employee.lastName}`}
                  />
                  
                  <div className="grid grid-cols-1 gap-4">
                    {(availabilityView === 'all' || availabilityView === 'weekly') && availability
                      .filter(s => statusFilter === 'all' ? true : statusFilter === 'available' ? s.isAvailable : !s.isAvailable)
                      .map((slot, index) => (
                      <div 
                        key={index}
                        onClick={() => openEditAvailabilityModal(slot)}
                        className="group flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 rounded-xl cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                            ${slot.isAvailable ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {slot.day.slice(0, 1)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{slot.day}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {slot.isAvailable 
                                ? (slot.type === 'all_day' ? 'Available all day' : `Available ${slot.startTime} - ${slot.endTime}`)
                                : 'Unavailable'}
                            </p>
                          </div>
                        </div>
                        
                        {slot.reason && (
                          <div className="hidden md:block text-sm text-gray-400 italic">
                            &quot;{slot.reason}&quot;
                          </div>
                        )}
                        
                        <div className="text-gray-400 group-hover:text-indigo-500 transition-colors">
                          Edit
                        </div>
                      </div>
                    ))}
                  </div>

                  {(availabilityView === 'all' || availabilityView === 'oneoff') && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mt-6 mb-4">One-off entries</h3>
                    {availabilityOneOffRecords.filter(r => statusFilter === 'all' ? true : statusFilter === 'available' ? !!r.isAvailable : !r.isAvailable).length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">No one-off entries</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {availabilityOneOffRecords
                          .filter(r => statusFilter === 'all' ? true : statusFilter === 'available' ? !!r.isAvailable : !r.isAvailable)
                          .map((rec: any) => {
                          const start = new Date(rec.startDate);
                          const end = rec.endDate ? new Date(rec.endDate) : null;
                          const dateLabel = start.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                          const timeLabel = rec.allDay
                            ? 'All day'
                            : `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${end ? ` - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`;
                          return (
                            <div
                              key={rec.id}
                              onClick={() => openEditOneOffAvailability(rec)}
                              className="group flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 rounded-xl cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                                  ${rec.isAvailable ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                  {dateLabel.slice(0, 1)}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">{dateLabel}</h4>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {rec.isAvailable ? `Available ${timeLabel}` : `Unavailable ${timeLabel}`}
                                  </p>
                                </div>
                              </div>
                              {rec.comment && (
                                <div className="hidden md:block text-sm text-gray-400 italic">
                                  &quot;{rec.comment}&quot;
                                </div>
                              )}
                              <div className="text-gray-400 group-hover:text-indigo-500 transition-colors">Edit</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </ContentCard>
            )}

            {editLeaveModal.isOpen && editLeaveModal.request && (
              <Modal isOpen={editLeaveModal.isOpen} onClose={() => setEditLeaveModal({ isOpen: false, request: null })} title="Edit Leave Request">
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                    <select
                      value={editForm.leaveTypeId}
                      onChange={(e) => setEditForm({ ...editForm, leaveTypeId: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                    >
                      <option value="">Select a leave type...</option>
                      {leaveTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={editForm.startDate}
                        onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                      <input
                        type="date"
                        value={editForm.endDate}
                        onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                    <textarea
                      rows={3}
                      value={editForm.reason}
                      onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setEditLeaveModal({ isOpen: false, request: null })}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditLeave}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </Modal>
            )}

            {activeTab === 'News feed' && (
              <ContentCard title="Activity Log">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {chatThreadId ? 'Direct chat' : 'Direct chat not started'}
                    </div>
                    <div className="flex items-center gap-2">
                      {chatThreadId && (
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `/dashboard/communications/chats?threadId=${encodeURIComponent(chatThreadId)}`;
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          Open in Chats
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={refreshChat}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 max-h-96 overflow-y-auto">
                    {chatLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading chat...</div>
                    ) : chatMessages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No messages yet</div>
                    ) : (
                      chatMessages.map((msg) => {
                        const isEmployee = msg.senderEmployeeId === employee.id;
                        return (
                          <div key={msg.id} className={`flex ${isEmployee ? 'justify-start' : 'justify-end'} mb-3`}>
                            <div
                              className={`max-w-[70%] px-3 py-2 rounded-lg text-sm shadow-sm ${
                                isEmployee ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100' : 'bg-indigo-600 text-white'
                              }`}
                            >
                              <div className="font-semibold mb-1">
                                {isEmployee ? 'Employee' : 'Admin'}
                                {msg.senderName ? ` • ${msg.senderName}` : ''}
                              </div>
                              <div>{msg.text || ''}</div>
                              <div className={`${isEmployee ? 'text-gray-500' : 'text-indigo-200'} text-xs mt-1`}>
                                {formatChatTime(msg.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!messageText.trim() || chatSending}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </ContentCard>
            )}

          </div>
        </div>
      </div>
    </Modal>
    
    <ManageLoginModal
      isOpen={isLoginModalOpen}
      onClose={() => setIsLoginModalOpen(false)}
      employeeId={employee.id}
      employeeName={`${employee.firstName} ${employee.lastName}`}
    />

    <ConfirmModal
      isOpen={confirmModal.isOpen}
      onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      title={confirmModal.title}
      message={confirmModal.message}
      onConfirm={confirmModal.onConfirm}
      variant={confirmModal.variant}
      confirmText={confirmModal.confirmText}
    />

    <RequestLeaveModal
      isOpen={isRequestLeaveModalOpen}
      onClose={() => setIsRequestLeaveModalOpen(false)}
      employeeId={employee.id}
      employeeName={`${employee.firstName} ${employee.lastName}`}
      onSuccess={() => {
        fetchLeaveData();
        toast.success('Leave request submitted');
      }}
    />
    
    {rejectModal.isOpen && (
      <Modal isOpen={rejectModal.isOpen} onClose={() => setRejectModal({ isOpen: false, requestId: null, reason: '', submitting: false })} title="Decline Leave Request">
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Provide a reason for rejection.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
            <textarea
              rows={4}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value, error: undefined }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-xs px-3 py-2 border"
            />
            {rejectModal.error && <div className="text-xs text-red-600 mt-1">{rejectModal.error}</div>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setRejectModal({ isOpen: false, requestId: null, reason: '', submitting: false })}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={submitReject}
              disabled={rejectModal.submitting || !rejectModal.reason.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {rejectModal.submitting ? 'Declining...' : 'Decline'}
            </button>
          </div>
        </div>
      </Modal>
    )}

    <AddLeaveEntitlementModal
      isOpen={isAddEntitlementModalOpen}
      onClose={() => setIsAddEntitlementModalOpen(false)}
      employeeId={employee.id}
      onSuccess={() => {
        fetchLeaveData();
        toast.success('Leave entitlement added');
      }}
    />
    </>
  );
}
