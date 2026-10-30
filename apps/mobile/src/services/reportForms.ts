export const reportForms = {
  INCIDENT: {
    label: "Incident report",
    type: "GENERAL",
    fields: ["Area / exact location", "Actions taken"],
  },
  PATROL: {
    label: "Patrol / rounds",
    type: "PATROL",
    fields: ["Route / areas checked", "Round start time", "Round end time"],
  },
  CAR_INVENTORY: {
    label: "Car inventory",
    type: "CAR_INVENTORY",
    fields: [
      "License plate / vehicle ID",
      "Make, model and color",
      "Vehicle condition",
      "Parking space / area",
    ],
  },
  SHIFT_REPORT: {
    label: "Shift report",
    type: "SHIFT_REPORT",
    fields: [
      "Shift start time",
      "Shift end time",
      "Handover officer / instructions",
    ],
  },
  VISITOR_LOG: {
    label: "Visitor’s log",
    type: "VISITOR_LOG",
    fields: [
      "Visitor name",
      "Person / department visited",
      "Purpose of visit",
      "Arrival time",
      "Departure time (optional)",
    ],
  },
} as const;
export type ReportCategory = keyof typeof reportForms;
export function reportDescription(
  category: ReportCategory,
  fields: Record<string, string>,
  details: string,
) {
  const form = reportForms[category];
  const missing = form.fields.find(
    (label) => !label.includes("(optional)") && !fields[label]?.trim(),
  );
  if (missing) throw Error(`Please enter ${missing.toLowerCase()}.`);
  if (details.trim().length < 10)
    throw Error("Please enter at least 10 characters in the report details.");
  return [
    form.label,
    ...form.fields.map(
      (label) => `${label}: ${fields[label]?.trim() || "Not recorded"}`,
    ),
    "",
    "Details:",
    details.trim(),
  ].join("\n");
}
