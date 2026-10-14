export interface DirectoryEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  type: string;
  payType: string;
  phone?: string;
  preferredName?: string;
  profileImageUrl?: string;
  workerType?: string;
  hourlyRate?: number | null;
  salary?: number | null;
  defaultLocationId?: string | null;
  departmentId?: string | null;
  defaultLocation?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  customRole?: { name: string } | null;
  w2Profile?: { rate: number; payType: string } | null;
  contractorProfile?: { rate: number } | null;
}
export function roleLabel(employee: DirectoryEmployee): string {
  if (employee.customRole?.name) return employee.customRole.name;
  const labels: Record<string, string> = {
    BUSINESS_ADMIN: "Administrator",
    SUPER_ADMIN: "System administrator",
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
  };
  return (
    labels[employee.role] ||
    String(employee.role || "Employee")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
export function savedPay(
  employee: DirectoryEmployee,
): { amount: number; unit: string } | null {
  let amount: number | null | undefined;
  let unit = "hour";
  if (employee.workerType === "CONTRACTOR_1099") {
    amount = employee.contractorProfile?.rate ?? employee.hourlyRate;
  } else if (employee.w2Profile) {
    amount = employee.w2Profile.rate;
    unit = ["SALARY", "SALARIED"].includes(employee.w2Profile.payType)
      ? "year"
      : "hour";
  } else if (["SALARY", "SALARIED"].includes(employee.payType)) {
    amount = employee.salary;
    unit = "year";
  } else amount = employee.hourlyRate;
  return amount != null &&
    Number.isFinite(Number(amount)) &&
    Number(amount) >= 0
    ? { amount: Number(amount), unit }
    : null;
}
export function matchesDirectory(
  employee: DirectoryEmployee,
  query: string,
): boolean {
  const haystack = [
    employee.firstName,
    employee.lastName,
    `${employee.firstName} ${employee.lastName}`,
    employee.preferredName,
    employee.email,
    employee.phone,
    roleLabel(employee),
    employee.defaultLocation?.name,
    employee.department?.name,
  ]
    .join(" ")
    .toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}
export function directoryCsv(employees: DirectoryEmployee[]): string {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows = [
    [
      "Employee ID",
      "First name",
      "Last name",
      "Email",
      "Phone",
      "Role",
      "Status",
      "Location",
      "Department",
      "Employment type",
    ],
    ...employees.map((e) => [
      e.id,
      e.firstName,
      e.lastName,
      e.email,
      e.phone || "",
      roleLabel(e),
      e.status,
      e.defaultLocation?.name || "",
      e.department?.name || "",
      e.type,
    ]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
export function toggleVisibleSelection(
  selected: Set<string>,
  visibleIds: string[],
): Set<string> {
  const next = new Set(selected);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => next.has(id));
  visibleIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
  return next;
}
