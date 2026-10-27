interface LocationTimesheet {
  id: string;
  startTime: string;
  endTime?: string | null;
  status: string;
  paidExternally?: boolean;
  location?: { id: string; name: string } | null;
  employee?: { firstName: string; lastName: string } | null;
  breaks?: { endTime?: string | null }[];
}

export function canApproveTimesheet(t: LocationTimesheet): boolean {
  return (
    t.status === "PENDING" &&
    !t.paidExternally &&
    !!t.endTime &&
    Number.isFinite(Date.parse(t.startTime)) &&
    Number.isFinite(Date.parse(t.endTime)) &&
    Date.parse(t.endTime) > Date.parse(t.startTime) &&
    !(t.breaks || []).some((b) => !b.endTime)
  );
}

export function groupTimesheetsByLocation<T extends LocationTimesheet>(
  records: T[],
) {
  const groups = new Map<
    string,
    { id: string; title: string; timesheets: T[] }
  >();
  for (const record of records) {
    const id = "location:" + (record.location?.id || "unassigned");
    if (!groups.has(id))
      groups.set(id, {
        id,
        title: record.location?.name || "Unassigned location",
        timesheets: [],
      });
    groups.get(id)!.timesheets.push(record);
  }
  return Array.from(groups.values())
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
    .map((g) => ({
      ...g,
      timesheets: [...g.timesheets].sort(
        (a, b) =>
          `${a.employee?.lastName || ""} ${a.employee?.firstName || ""}`.localeCompare(
            `${b.employee?.lastName || ""} ${b.employee?.firstName || ""}`,
          ) ||
          Date.parse(a.startTime) - Date.parse(b.startTime) ||
          a.id.localeCompare(b.id),
      ),
    }));
}
