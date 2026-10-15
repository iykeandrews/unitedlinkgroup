export const w2Fields = [
  "paySchedule",
  "payType",
  "overtimeEligible",
  "filingStatus",
  "taxState",
  "federalAllowances",
  "multipleJobs",
  "dependentsAmount",
  "otherIncome",
  "deductionsAmount",
  "additionalWithholding",
  "stateFilingStatus",
  "stateAllowances",
  "stateAdditionalWithholding",
];
export function employmentForm(employee: any) {
  const form = structuredClone(employee);
  form.workerType ||= "W2";
  if (form.workerType !== "CONTRACTOR_1099") {
    const profile = form.w2Profile || {
      paySchedule: form.paySchedule || "BI_WEEKLY",
      payType: form.payType || "HOURLY",
      rate:
        form.payType === "SALARY" ? (form.salary ?? 0) : (form.hourlyRate ?? 0),
      overtimeEligible: form.overtimeEligible ?? true,
    };
    if (profile.payType === "SALARIED") profile.payType = "SALARY";
    for (const k of w2Fields)
      if (profile[k] !== undefined) form[k] = profile[k];
    form.w2Profile = profile;
    form.payType = profile.payType;
    form.paySchedule = profile.paySchedule;
    if (profile.payType === "SALARY") form.salary = profile.rate;
    else form.hourlyRate = profile.rate;
  }
  if (form.workerType !== "W2") {
    form.contractorProfile ||= {
      rate: form.hourlyRate ?? 0,
      w9Confirmed: form.w9Confirmed ?? false,
      businessName: form.contractorBusinessName,
      type: form.contractorType,
    };
    form.contractorBusinessName = form.contractorProfile.businessName;
    form.contractorType = form.contractorProfile.type;
    form.w9Confirmed = form.contractorProfile.w9Confirmed;
    if (form.workerType === "CONTRACTOR_1099") {
      form.payType = "HOURLY";
      form.hourlyRate = form.contractorProfile.rate;
    }
  }
  return form;
}
export function employmentField(form: any, field: string, value: any) {
  const next = { ...form, [field]: value };
  if (field === "workerType") return employmentForm(next);
  if (next.workerType !== "CONTRACTOR_1099") {
    const profile = { ...next.w2Profile };
    if (w2Fields.includes(field)) profile[field] = value;
    if (
      (field === "hourlyRate" && next.payType === "HOURLY") ||
      (field === "salary" && next.payType === "SALARY")
    )
      profile.rate = value;
    if (field === "payType")
      profile.rate =
        value === "SALARY" ? (next.salary ?? 0) : (next.hourlyRate ?? 0);
    next.w2Profile = profile;
  }
  if (next.workerType !== "W2") {
    const profile = { ...next.contractorProfile };
    const key: Record<string, string> = {
      contractorBusinessName: "businessName",
      contractorType: "type",
      w9Confirmed: "w9Confirmed",
    };
    if (key[field]) profile[key[field]] = value;
    if (next.workerType === "CONTRACTOR_1099" && field === "hourlyRate")
      profile.rate = value;
    next.contractorProfile = profile;
  }
  return next;
}
export function employmentPayload(form: any) {
  const fields = [
    "role",
    "customRoleId",
    "type",
    "hireDate",
    "payrollId",
    "workerType",
    "paySchedule",
    "payType",
    "hourlyRate",
    "salary",
    "overtimeEligible",
    "workPeriod",
    "hoursPerPeriod",
    "daysPerPeriod",
    "stressProfile",
    ...w2Fields,
    "contractorBusinessName",
    "contractorType",
    "w9Confirmed",
  ];
  const data: any = Object.fromEntries(
    fields.filter((k) => form[k] !== undefined).map((k) => [k, form[k]]),
  );
  for (const [key, fields] of [
    ["w2Profile", [...w2Fields, "rate"]],
    [
      "contractorProfile",
      ["businessName", "type", "w9Confirmed", "rate", "paymentMethod"],
    ],
  ] as const) {
    const active =
      key === "w2Profile"
        ? form.workerType !== "CONTRACTOR_1099"
        : form.workerType !== "W2";
    if (active && form[key])
      data[key] = Object.fromEntries(
        fields
          .filter((k) => form[key][k] !== undefined)
          .map((k) => [k, form[key][k]]),
      );
  }
  if (form.workerType === "CONTRACTOR_1099") {
    data.payType = "HOURLY";
    data.salary = null;
    data.overtimeEligible = false;
  }
  return data;
}
