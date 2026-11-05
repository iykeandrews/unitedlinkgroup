import { BadRequestException } from "@nestjs/common";
const editable = [
  "name",
  "type",
  "issuingOrganization",
  "credentialId",
  "issueDate",
  "expiryDate",
  "fileUrl",
  "status",
] as const;
export function qualificationFields(input: any, existing?: any) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new BadRequestException("Invalid credential details");
  const data: any = Object.fromEntries(
    editable
      .filter((key) => input[key] !== undefined)
      .map((key) => [key, input[key]]),
  );
  if (
    data.name !== undefined &&
    (typeof data.name !== "string" || !data.name.trim())
  )
    throw new BadRequestException("Credential name is required");
  if (data.name) data.name = data.name.trim();
  for (const key of ["issueDate", "expiryDate"]) {
    if (data[key] === "") data[key] = null;
    if (typeof data[key] === "string") {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(data[key]);
      if (match) {
        const civil = new Date(Date.UTC(Number(match[1]), Number(match[2])-1, Number(match[3])));
        if(civil.toISOString().slice(0,10) !== data[key].slice(0,10)) throw new BadRequestException("Enter a valid "+key);
      }
    }
    if (data[key] != null && !Number.isFinite(+new Date(data[key])))
      throw new BadRequestException("Enter a valid " + key);
  }
  const issue =
    data.issueDate !== undefined ? data.issueDate : existing?.issueDate;
  const expiry =
    data.expiryDate !== undefined ? data.expiryDate : existing?.expiryDate;
  if (issue && expiry && +new Date(expiry) < +new Date(issue))
    throw new BadRequestException("Expiry date cannot be before issue date");
  return data;
}
