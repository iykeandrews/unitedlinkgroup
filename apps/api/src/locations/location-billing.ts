import { BadRequestException } from "@nestjs/common";

export const BILLING_SERVICE_NAMES: Record<string, string> = {
  ARMED_SPO: "Armed special police officer",
  UNARMED_SPO: "Unarmed special police officer",
  SECURITY_OFFICER: "Security officer",
  SECURITY_GUARD: "Security guard",
  ARMED_SECURITY_GUARD: "Armed security guard",
  PRIVATE_DETECTIVE: "Private detective",
};
export type BillingService = {
  type: string;
  description: string;
  rate: number;
};
export function normalizeBillingServices(value: any): BillingService[] {
  if (!Array.isArray(value) || value.length > 50)
    throw new BadRequestException("Enter up to 50 billing services");
  const seen = new Set<string>();
  return value.map((row) => {
    if (
      !row ||
      !(
        Object.prototype.hasOwnProperty.call(BILLING_SERVICE_NAMES, row.type) ||
        row.type === "OTHER"
      )
    )
      throw new BadRequestException("Select a valid service type");
    const description =
      row.type === "OTHER"
        ? String(row.description || "").trim()
        : BILLING_SERVICE_NAMES[row.type];
    if (!description || description.length > 200)
      throw new BadRequestException(
        "Enter a service description (up to 200 characters)",
      );
    if (
      typeof row.rate !== "number" ||
      !Number.isFinite(row.rate) ||
      row.rate < 0 ||
      row.rate > 1000000 ||
      Math.abs(Math.round(row.rate * 100) / 100 - row.rate) > 0.000001
    )
      throw new BadRequestException(
        "Enter a valid hourly billing rate with at most two decimal places",
      );
    const key = description.toLowerCase();
    if (seen.has(key))
      throw new BadRequestException(
        "Each service description must be unique at this location",
      );
    seen.add(key);
    return { type: row.type, description, rate: row.rate };
  });
}
export function billingServiceChanges(
  before: BillingService[],
  after: BillingService[],
) {
  const changes: any[] = [];
  for (const row of after) {
    const prior = before.find(
      (old) => old.description.toLowerCase() === row.description.toLowerCase(),
    );
    if (!prior)
      changes.push({
        action: "SERVICE_ADDED",
        description: row.description,
        previousRate: null,
        rate: row.rate,
      });
    else if (prior.rate !== row.rate)
      changes.push({
        action: row.rate > prior.rate ? "RATE_INCREASED" : "RATE_DECREASED",
        description: row.description,
        previousRate: prior.rate,
        rate: row.rate,
      });
  }
  for (const row of before)
    if (
      !after.some(
        (next) =>
          next.description.toLowerCase() === row.description.toLowerCase(),
      )
    )
      changes.push({
        action: "SERVICE_REMOVED",
        description: row.description,
        previousRate: row.rate,
        rate: null,
      });
  return changes;
}
