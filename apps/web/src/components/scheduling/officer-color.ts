/** Stable across weeks, filters, devices and new hires; never based on name spelling. */
export function officerColor(id: string) {
  let hash=2166136261;
  for(const character of id) hash=Math.imul(hash ^ character.charCodeAt(0),16777619)>>>0;
  const hue=(hash % 3600)/10, saturation=65+((hash>>>12)%20), lightness=86+((hash>>>20)%8);
  return {hue,saturation,lightness,background:`hsl(${hue} ${saturation}% ${lightness}%)`,border:`hsl(${hue} 60% 43%)`};
}
