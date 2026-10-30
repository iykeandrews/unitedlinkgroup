export const reportCategoryLabel = (type?: string) =>
  ({
    PATROL: "Patrol / rounds",
    CAR_INVENTORY: "Car inventory",
    SHIFT_REPORT: "Shift report",
    VISITOR_LOG: "Visitor’s log",
  })[type || ""] || "Incident report";
