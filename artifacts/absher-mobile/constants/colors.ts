/**
 * Brand palette — extracted from the compass-star logo:
 *   Navy  #0A2342  (logo background)
 *   Gold  #D4AF37  (compass/star)
 *   Blue  #2563EB  (secondary / links)
 *
 * Light mode  → white canvas, navy actions, gold highlights
 * Dark  mode  → deep-navy canvas, same gold highlights
 */
const colors = {
  light: {
    background:       '#FFFFFF',
    foreground:       '#0A2342',
    card:             '#FFFFFF',
    cardForeground:   '#0A2342',
    // Surfaces
    muted:            '#F3F6FA',        // very-light navy tint
    mutedForeground:  '#64748B',
    border:           '#D9E2EF',
    input:            '#D9E2EF',
    // Brand primaries
    primary:          '#0A2342',        // navy  → main buttons, headers
    primaryForeground:'#FFFFFF',
    secondary:        '#2563EB',        // royal-blue → links, secondary actions
    secondaryForeground: '#FFFFFF',
    accent:           '#D4AF37',        // gold  → badges, highlights, active tab
    accentForeground: '#0A2342',
    // Semantic
    success:          '#16A34A',
    warning:          '#EAB308',
    destructive:      '#EF4444',
    destructiveForeground: '#FFFFFF',
    // Icon-container tints (match logo palette)
    iconBg:           '#EBF0F8',        // subtle navy tint
    goldTint:         '#FBF6E4',        // subtle gold tint
    text:             '#0A2342',
    tint:             '#0A2342',
  },
  dark: {
    background:       '#071525',        // deepest navy
    foreground:       '#F1F5F9',
    card:             '#0A2342',        // logo-navy as card bg
    cardForeground:   '#F1F5F9',
    muted:            '#0F2B47',
    mutedForeground:  '#94A3B8',
    border:           '#0F2B47',
    input:            '#0F2B47',
    primary:          '#D4AF37',        // gold becomes primary accent in dark
    primaryForeground:'#0A2342',
    secondary:        '#2563EB',
    secondaryForeground: '#FFFFFF',
    accent:           '#D4AF37',
    accentForeground: '#0A2342',
    success:          '#22C55E',
    warning:          '#EAB308',
    destructive:      '#EF4444',
    destructiveForeground: '#FFFFFF',
    iconBg:           'rgba(212,175,55,0.14)',  // subtle gold tint
    goldTint:         'rgba(212,175,55,0.18)',
    text:             '#F1F5F9',
    tint:             '#D4AF37',
  },
  // ── static brand tokens (same in both modes) ──
  navy:   '#0A2342',
  gold:   '#D4AF37',
  blue:   '#2563EB',
  radius: 12,
};

export default colors;
