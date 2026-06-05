
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  firstName: 'firstName',
  lastName: 'lastName',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BusinessScalarFieldEnum = {
  id: 'id',
  name: 'name',
  logoUrl: 'logoUrl',
  ein: 'ein',
  mobile: 'mobile',
  country: 'country',
  currencyCode: 'currencyCode',
  governmentInfo: 'governmentInfo',
  businessType: 'businessType',
  industry: 'industry',
  employeeCount: 'employeeCount',
  address: 'address',
  city: 'city',
  state: 'state',
  zip: 'zip',
  modules: 'modules',
  status: 'status',
  settings: 'settings',
  ownerId: 'ownerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VendorScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  userId: 'userId',
  companyName: 'companyName',
  contactFirstName: 'contactFirstName',
  contactLastName: 'contactLastName',
  email: 'email',
  phone: 'phone',
  website: 'website',
  serviceCategory: 'serviceCategory',
  portalSlug: 'portalSlug',
  status: 'status',
  notes: 'notes',
  accessReports: 'accessReports',
  accessContracts: 'accessContracts',
  accessCompliance: 'accessCompliance',
  accessAnnouncements: 'accessAnnouncements',
  accessIncidentReports: 'accessIncidentReports',
  accessTimeTracking: 'accessTimeTracking',
  agreementStartDate: 'agreementStartDate',
  agreementEndDate: 'agreementEndDate',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  permissions: 'permissions',
  isSystem: 'isSystem',
  businessId: 'businessId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeScalarFieldEnum = {
  id: 'id',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  badgeNumber: 'badgeNumber',
  profileImageUrl: 'profileImageUrl',
  businessId: 'businessId',
  userId: 'userId',
  role: 'role',
  customRoleId: 'customRoleId',
  status: 'status',
  preferredName: 'preferredName',
  pronouns: 'pronouns',
  middleName: 'middleName',
  dateOfBirth: 'dateOfBirth',
  isAuthorizedToWork: 'isAuthorizedToWork',
  address: 'address',
  city: 'city',
  state: 'state',
  zip: 'zip',
  country: 'country',
  officialEmail: 'officialEmail',
  emergencyContactName: 'emergencyContactName',
  emergencyContactPhone: 'emergencyContactPhone',
  type: 'type',
  workerType: 'workerType',
  paySchedule: 'paySchedule',
  payType: 'payType',
  hourlyRate: 'hourlyRate',
  salary: 'salary',
  hireDate: 'hireDate',
  payrollId: 'payrollId',
  workPeriod: 'workPeriod',
  hoursPerPeriod: 'hoursPerPeriod',
  daysPerPeriod: 'daysPerPeriod',
  stressProfile: 'stressProfile',
  overtimeEligible: 'overtimeEligible',
  departmentId: 'departmentId',
  defaultLocationId: 'defaultLocationId',
  supervisorId: 'supervisorId',
  ssn: 'ssn',
  filingStatus: 'filingStatus',
  taxState: 'taxState',
  federalAllowances: 'federalAllowances',
  multipleJobs: 'multipleJobs',
  dependentsAmount: 'dependentsAmount',
  otherIncome: 'otherIncome',
  deductionsAmount: 'deductionsAmount',
  additionalWithholding: 'additionalWithholding',
  stateFilingStatus: 'stateFilingStatus',
  stateAllowances: 'stateAllowances',
  stateAdditionalWithholding: 'stateAdditionalWithholding',
  contractorBusinessName: 'contractorBusinessName',
  contractorType: 'contractorType',
  w9Confirmed: 'w9Confirmed',
  directDepositInfo: 'directDepositInfo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  status: 'status',
  businessId: 'businessId',
  managerId: 'managerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ChatThreadScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  type: 'type',
  title: 'title',
  imageUrl: 'imageUrl',
  directKey: 'directKey',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ChatParticipantScalarFieldEnum = {
  id: 'id',
  threadId: 'threadId',
  employeeId: 'employeeId',
  role: 'role',
  lastReadAt: 'lastReadAt',
  muted: 'muted',
  joinedAt: 'joinedAt'
};

exports.Prisma.ChatMessageScalarFieldEnum = {
  id: 'id',
  threadId: 'threadId',
  senderEmployeeId: 'senderEmployeeId',
  text: 'text',
  replyToId: 'replyToId',
  editedAt: 'editedAt',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ChatAttachmentScalarFieldEnum = {
  id: 'id',
  messageId: 'messageId',
  type: 'type',
  url: 'url',
  filename: 'filename',
  originalName: 'originalName',
  mimeType: 'mimeType',
  size: 'size',
  createdAt: 'createdAt'
};

exports.Prisma.ChatReactionScalarFieldEnum = {
  id: 'id',
  messageId: 'messageId',
  employeeId: 'employeeId',
  emoji: 'emoji',
  createdAt: 'createdAt'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  title: 'title',
  content: 'content',
  priority: 'priority',
  authorId: 'authorId',
  targetType: 'targetType',
  targetValue: 'targetValue',
  scheduledAt: 'scheduledAt',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnnouncementReadScalarFieldEnum = {
  id: 'id',
  announcementId: 'announcementId',
  userId: 'userId',
  readAt: 'readAt'
};

exports.Prisma.EmailCampaignScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  subject: 'subject',
  content: 'content',
  senderId: 'senderId',
  targetType: 'targetType',
  targetValue: 'targetValue',
  status: 'status',
  scheduledAt: 'scheduledAt',
  sentAt: 'sentAt',
  recipientCount: 'recipientCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmailCampaignAttachmentScalarFieldEnum = {
  id: 'id',
  emailCampaignId: 'emailCampaignId',
  filename: 'filename',
  contentType: 'contentType',
  contentBase64: 'contentBase64',
  size: 'size',
  createdAt: 'createdAt'
};

exports.Prisma.EmailTemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  subject: 'subject',
  content: 'content',
  businessId: 'businessId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClientScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  type: 'type',
  industry: 'industry',
  status: 'status',
  address: 'address',
  street: 'street',
  city: 'city',
  state: 'state',
  zip: 'zip',
  country: 'country',
  contactPerson: 'contactPerson',
  email: 'email',
  phone: 'phone',
  alternateContact: 'alternateContact',
  billingAddressSameAsOffice: 'billingAddressSameAsOffice',
  billingAddress: 'billingAddress',
  billingContactEmail: 'billingContactEmail',
  billingContactEmail2: 'billingContactEmail2',
  billingContactEmail3: 'billingContactEmail3',
  paymentTerms: 'paymentTerms',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LocationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  address: 'address',
  businessId: 'businessId',
  clientId: 'clientId',
  geoLat: 'geoLat',
  geoLng: 'geoLng',
  radius: 'radius',
  workOrder: 'workOrder',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  taxOverrideInfo: 'taxOverrideInfo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServicePinScalarFieldEnum = {
  id: 'id',
  locationId: 'locationId',
  positionType: 'positionType',
  count: 'count',
  shiftType: 'shiftType',
  startTime: 'startTime',
  endTime: 'endTime',
  days: 'days',
  payRate: 'payRate',
  specialInstructions: 'specialInstructions',
  geoLat: 'geoLat',
  geoLng: 'geoLng',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatrolLogScalarFieldEnum = {
  id: 'id',
  servicePinId: 'servicePinId',
  userId: 'userId',
  message: 'message',
  type: 'type',
  geoLat: 'geoLat',
  geoLng: 'geoLng',
  imageUrl: 'imageUrl',
  createdAt: 'createdAt'
};

exports.Prisma.W2ProfileScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  paySchedule: 'paySchedule',
  payType: 'payType',
  rate: 'rate',
  overtimeEligible: 'overtimeEligible',
  filingStatus: 'filingStatus',
  taxState: 'taxState',
  federalAllowances: 'federalAllowances',
  multipleJobs: 'multipleJobs',
  dependentsAmount: 'dependentsAmount',
  otherIncome: 'otherIncome',
  deductionsAmount: 'deductionsAmount',
  additionalWithholding: 'additionalWithholding',
  stateFilingStatus: 'stateFilingStatus',
  stateAllowances: 'stateAllowances',
  stateAdditionalWithholding: 'stateAdditionalWithholding',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContractorProfileScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  businessName: 'businessName',
  type: 'type',
  w9Confirmed: 'w9Confirmed',
  rate: 'rate',
  paymentMethod: 'paymentMethod'
};

exports.Prisma.LeaveTypeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  businessId: 'businessId',
  isPaid: 'isPaid',
  allowNegative: 'allowNegative',
  requiresApproval: 'requiresApproval',
  color: 'color',
  accrualFrequency: 'accrualFrequency',
  accrualRate: 'accrualRate',
  maxBalance: 'maxBalance',
  carryOverLimit: 'carryOverLimit'
};

exports.Prisma.CompanyCertificationScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  type: 'type',
  issuingOrganization: 'issuingOrganization',
  credentialId: 'credentialId',
  issueDate: 'issueDate',
  expiryDate: 'expiryDate',
  fileUrl: 'fileUrl',
  status: 'status',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContractDocumentScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  title: 'title',
  type: 'type',
  status: 'status',
  employeeId: 'employeeId',
  clientId: 'clientId',
  counterpartyName: 'counterpartyName',
  effectiveDate: 'effectiveDate',
  endDate: 'endDate',
  fileUrl: 'fileUrl',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComplianceDocumentScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  title: 'title',
  category: 'category',
  status: 'status',
  version: 'version',
  effectiveDate: 'effectiveDate',
  reviewDate: 'reviewDate',
  ownerEmployeeId: 'ownerEmployeeId',
  acknowledgementRequired: 'acknowledgementRequired',
  tags: 'tags',
  fileUrl: 'fileUrl',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeFormTemplateScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  type: 'type',
  title: 'title',
  description: 'description',
  status: 'status',
  version: 'version',
  body: 'body',
  fields: 'fields',
  fileUrl: 'fileUrl',
  acknowledgementRequired: 'acknowledgementRequired',
  requiresSignature: 'requiresSignature',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeFormAssignmentScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  templateId: 'templateId',
  employeeId: 'employeeId',
  status: 'status',
  assignedAt: 'assignedAt',
  dueAt: 'dueAt',
  submittedAt: 'submittedAt',
  values: 'values',
  signatureName: 'signatureName',
  signatureData: 'signatureData',
  signedAt: 'signedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaveBalanceScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  leaveTypeId: 'leaveTypeId',
  balanceHours: 'balanceHours',
  takenHours: 'takenHours'
};

exports.Prisma.LeaveRequestScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  leaveTypeId: 'leaveTypeId',
  startDate: 'startDate',
  endDate: 'endDate',
  isAllDay: 'isAllDay',
  startTime: 'startTime',
  endTime: 'endTime',
  totalHours: 'totalHours',
  actualHours: 'actualHours',
  resumedAt: 'resumedAt',
  resumedReason: 'resumedReason',
  refundedHours: 'refundedHours',
  cancelledAt: 'cancelledAt',
  cancelledReason: 'cancelledReason',
  status: 'status',
  reason: 'reason',
  rejectionReason: 'rejectionReason',
  managerId: 'managerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaveAttachmentScalarFieldEnum = {
  id: 'id',
  leaveRequestId: 'leaveRequestId',
  url: 'url',
  fileName: 'fileName'
};

exports.Prisma.ShiftScalarFieldEnum = {
  id: 'id',
  groupId: 'groupId',
  businessId: 'businessId',
  locationId: 'locationId',
  employeeId: 'employeeId',
  startTime: 'startTime',
  endTime: 'endTime',
  breakMinutes: 'breakMinutes',
  status: 'status',
  notes: 'notes',
  reminderSent1h: 'reminderSent1h',
  reminderSent30m: 'reminderSent30m',
  reminderSent10m: 'reminderSent10m',
  reminderEnd5mSent: 'reminderEnd5mSent',
  reminderEndLate10mSent: 'reminderEndLate10mSent',
  autoClockout1hDone: 'autoClockout1hDone',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OperationAssignmentScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  locationId: 'locationId',
  assigneeId: 'assigneeId',
  startAt: 'startAt',
  dueAt: 'dueAt',
  completedAt: 'completedAt',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShiftCalloutScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  shiftId: 'shiftId',
  absentEmployeeId: 'absentEmployeeId',
  reasonCode: 'reasonCode',
  reasonNote: 'reasonNote',
  type: 'type',
  noticeAt: 'noticeAt',
  documentationUrl: 'documentationUrl',
  submittedByUserId: 'submittedByUserId',
  status: 'status',
  reviewedAt: 'reviewedAt',
  reviewedByUserId: 'reviewedByUserId',
  rejectionReason: 'rejectionReason',
  openedAt: 'openedAt',
  openedByUserId: 'openedByUserId',
  resolvedAt: 'resolvedAt',
  resolvedByUserId: 'resolvedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShiftCoverageScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  shiftId: 'shiftId',
  calloutId: 'calloutId',
  absentEmployeeId: 'absentEmployeeId',
  replacementEmployeeId: 'replacementEmployeeId',
  method: 'method',
  reassignedAt: 'reassignedAt',
  reassignedByUserId: 'reassignedByUserId',
  acceptedAt: 'acceptedAt',
  responseMinutes: 'responseMinutes'
};

exports.Prisma.ShiftApplicationScalarFieldEnum = {
  id: 'id',
  shiftId: 'shiftId',
  employeeId: 'employeeId',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.ShiftSwapRequestScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  requesterEmployeeId: 'requesterEmployeeId',
  offeredShiftId: 'offeredShiftId',
  requestedShiftId: 'requestedShiftId',
  offeredEmployeeId: 'offeredEmployeeId',
  requestedEmployeeId: 'requestedEmployeeId',
  message: 'message',
  status: 'status',
  reviewedByUserId: 'reviewedByUserId',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TimesheetScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  locationId: 'locationId',
  workerType: 'workerType',
  startTime: 'startTime',
  endTime: 'endTime',
  status: 'status',
  clockInIp: 'clockInIp',
  clockOutIp: 'clockOutIp',
  clockInLat: 'clockInLat',
  clockInLng: 'clockInLng',
  clockOutLat: 'clockOutLat',
  clockOutLng: 'clockOutLng',
  employeeNote: 'employeeNote',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BreakScalarFieldEnum = {
  id: 'id',
  timesheetId: 'timesheetId',
  startTime: 'startTime',
  endTime: 'endTime',
  type: 'type'
};

exports.Prisma.PayrollScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  payDate: 'payDate',
  type: 'type',
  status: 'status',
  totalGross: 'totalGross',
  totalNet: 'totalNet',
  totalEmployeeTaxes: 'totalEmployeeTaxes',
  totalEmployerTaxes: 'totalEmployerTaxes',
  totalDeductions: 'totalDeductions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayStubScalarFieldEnum = {
  id: 'id',
  payrollId: 'payrollId',
  employeeId: 'employeeId',
  workerType: 'workerType',
  regularHours: 'regularHours',
  overtimeHours: 'overtimeHours',
  regularPay: 'regularPay',
  overtimePay: 'overtimePay',
  bonus: 'bonus',
  commission: 'commission',
  reimbursement: 'reimbursement',
  grossPay: 'grossPay',
  netPay: 'netPay',
  ytdGross: 'ytdGross',
  ytdNet: 'ytdNet',
  ytdTaxes: 'ytdTaxes',
  taxes: 'taxes',
  employerTaxes: 'employerTaxes',
  deductions: 'deductions',
  taxDetails: 'taxDetails',
  employerTaxDetails: 'employerTaxDetails',
  deductionDetails: 'deductionDetails',
  createdAt: 'createdAt'
};

exports.Prisma.LoanScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  amount: 'amount',
  balance: 'balance',
  termMonths: 'termMonths',
  perPayPeriodDeduction: 'perPayPeriodDeduction',
  reason: 'reason',
  status: 'status',
  approvedBy: 'approvedBy',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LoanRepaymentScalarFieldEnum = {
  id: 'id',
  loanId: 'loanId',
  payrollId: 'payrollId',
  amount: 'amount',
  date: 'date'
};

exports.Prisma.AvailabilityScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  isAvailable: 'isAvailable',
  startDate: 'startDate',
  endDate: 'endDate',
  allDay: 'allDay',
  repeat: 'repeat',
  repeatDays: 'repeatDays',
  endOption: 'endOption',
  endOn: 'endOn',
  comment: 'comment',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  clientId: 'clientId',
  locationId: 'locationId',
  invoiceNumber: 'invoiceNumber',
  issueDate: 'issueDate',
  dueDate: 'dueDate',
  status: 'status',
  notes: 'notes',
  subtotal: 'subtotal',
  taxRate: 'taxRate',
  taxAmount: 'taxAmount',
  total: 'total',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceItemScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  description: 'description',
  quantity: 'quantity',
  rate: 'rate',
  amount: 'amount'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  message: 'message',
  type: 'type',
  read: 'read',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.WebPushSubscriptionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  endpoint: 'endpoint',
  p256dh: 'p256dh',
  auth: 'auth',
  lastUsedAt: 'lastUsedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ExpoPushTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  lastUsedAt: 'lastUsedAt',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  userId: 'userId',
  action: 'action',
  resource: 'resource',
  resourceId: 'resourceId',
  details: 'details',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.QualificationScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  name: 'name',
  type: 'type',
  issuingOrganization: 'issuingOrganization',
  credentialId: 'credentialId',
  issueDate: 'issueDate',
  expiryDate: 'expiryDate',
  fileUrl: 'fileUrl',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.IncidentReportScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  reportNumber: 'reportNumber',
  title: 'title',
  description: 'description',
  type: 'type',
  severity: 'severity',
  status: 'status',
  date: 'date',
  incidentAt: 'incidentAt',
  reportedAt: 'reportedAt',
  shift: 'shift',
  buildingArea: 'buildingArea',
  responseAction: 'responseAction',
  witnessPresent: 'witnessPresent',
  lawEnforcementInvolved: 'lawEnforcementInvolved',
  evidenceCollected: 'evidenceCollected',
  locationId: 'locationId',
  reporterId: 'reporterId',
  reportingOfficerEmployeeId: 'reportingOfficerEmployeeId',
  submittedById: 'submittedById',
  assignedSupervisorId: 'assignedSupervisorId',
  assignedInvestigatorId: 'assignedInvestigatorId',
  images: 'images',
  deviceInfo: 'deviceInfo',
  geoLat: 'geoLat',
  geoLng: 'geoLng',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.IncidentPersonScalarFieldEnum = {
  id: 'id',
  incidentId: 'incidentId',
  role: 'role',
  name: 'name',
  contactInfo: 'contactInfo',
  createdAt: 'createdAt'
};

exports.Prisma.IncidentEvidenceScalarFieldEnum = {
  id: 'id',
  incidentId: 'incidentId',
  kind: 'kind',
  url: 'url',
  filename: 'filename',
  originalName: 'originalName',
  mimeType: 'mimeType',
  sizeBytes: 'sizeBytes',
  uploadedById: 'uploadedById',
  createdAt: 'createdAt'
};

exports.Prisma.IncidentTimelineEventScalarFieldEnum = {
  id: 'id',
  incidentId: 'incidentId',
  eventType: 'eventType',
  actorUserId: 'actorUserId',
  payload: 'payload',
  createdAt: 'createdAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  description: 'description',
  serialNumber: 'serialNumber',
  category: 'category',
  type: 'type',
  brand: 'brand',
  model: 'model',
  size: 'size',
  color: 'color',
  condition: 'condition',
  vendor: 'vendor',
  quantity: 'quantity',
  licenseNumber: 'licenseNumber',
  complianceChecked: 'complianceChecked',
  purchaseDate: 'purchaseDate',
  purchaseCost: 'purchaseCost',
  warrantyExpiration: 'warrantyExpiration',
  status: 'status',
  locationId: 'locationId',
  assignedToId: 'assignedToId',
  assignedDate: 'assignedDate',
  expectedReturnDate: 'expectedReturnDate',
  notes: 'notes',
  parentId: 'parentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetAssignmentHistoryScalarFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  employeeId: 'employeeId',
  assignedDate: 'assignedDate',
  returnedDate: 'returnedDate',
  returnCondition: 'returnCondition',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  date: 'date',
  amount: 'amount',
  type: 'type',
  category: 'category',
  method: 'method',
  status: 'status',
  payeeName: 'payeeName',
  reference: 'reference',
  dcWard: 'dcWard',
  description: 'description',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  Business: 'Business',
  Vendor: 'Vendor',
  Role: 'Role',
  Employee: 'Employee',
  Department: 'Department',
  ChatThread: 'ChatThread',
  ChatParticipant: 'ChatParticipant',
  ChatMessage: 'ChatMessage',
  ChatAttachment: 'ChatAttachment',
  ChatReaction: 'ChatReaction',
  Announcement: 'Announcement',
  AnnouncementRead: 'AnnouncementRead',
  EmailCampaign: 'EmailCampaign',
  EmailCampaignAttachment: 'EmailCampaignAttachment',
  EmailTemplate: 'EmailTemplate',
  Client: 'Client',
  Location: 'Location',
  ServicePin: 'ServicePin',
  PatrolLog: 'PatrolLog',
  W2Profile: 'W2Profile',
  ContractorProfile: 'ContractorProfile',
  LeaveType: 'LeaveType',
  CompanyCertification: 'CompanyCertification',
  ContractDocument: 'ContractDocument',
  ComplianceDocument: 'ComplianceDocument',
  EmployeeFormTemplate: 'EmployeeFormTemplate',
  EmployeeFormAssignment: 'EmployeeFormAssignment',
  LeaveBalance: 'LeaveBalance',
  LeaveRequest: 'LeaveRequest',
  LeaveAttachment: 'LeaveAttachment',
  Shift: 'Shift',
  OperationAssignment: 'OperationAssignment',
  ShiftCallout: 'ShiftCallout',
  ShiftCoverage: 'ShiftCoverage',
  ShiftApplication: 'ShiftApplication',
  ShiftSwapRequest: 'ShiftSwapRequest',
  Timesheet: 'Timesheet',
  Break: 'Break',
  Payroll: 'Payroll',
  PayStub: 'PayStub',
  Loan: 'Loan',
  LoanRepayment: 'LoanRepayment',
  Availability: 'Availability',
  Invoice: 'Invoice',
  InvoiceItem: 'InvoiceItem',
  Notification: 'Notification',
  WebPushSubscription: 'WebPushSubscription',
  ExpoPushToken: 'ExpoPushToken',
  AuditLog: 'AuditLog',
  Qualification: 'Qualification',
  IncidentReport: 'IncidentReport',
  IncidentPerson: 'IncidentPerson',
  IncidentEvidence: 'IncidentEvidence',
  IncidentTimelineEvent: 'IncidentTimelineEvent',
  Asset: 'Asset',
  AssetAssignmentHistory: 'AssetAssignmentHistory',
  Payment: 'Payment'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
