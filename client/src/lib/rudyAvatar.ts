// Picks Rudy's expression for the reminder card avatar based on rudeness
// severity — gentler levels get the content/relaxed face, harsher levels
// get the mischievous smirk.
export function getRudyAvatarSrc(rudenessLevel: number | undefined | null): string {
  const level = rudenessLevel ?? 3;
  if (level <= 2) return "/rudy/Rudy_content_smile_transparent.png";
  if (level === 3) return "/rudy/Rudy_smirk_content_transparent.png";
  return "/rudy/Rudy_mischief_smirk_transparent.png";
}
