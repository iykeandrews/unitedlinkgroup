/** Dashboard summaries must never erase fields from a full, same-business record. */
export function mergeBusinessSelection<T extends { id: string }>(selection: T, known?: T | null): T {
  return known?.id === selection.id ? { ...known, ...selection } : selection;
}

/** Only an explicit logo edit may replace or clear the persisted logo URL. */
export function businessProfileFields(form: Record<string, unknown>, logoEdited: boolean) {
  const fields = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
  delete fields.clearLogo;
  if (logoEdited) {
    fields.logoUrl = String(form.logoUrl || '').trim();
    if (!fields.logoUrl) fields.clearLogo = true;
  } else delete fields.logoUrl;
  return fields;
}
