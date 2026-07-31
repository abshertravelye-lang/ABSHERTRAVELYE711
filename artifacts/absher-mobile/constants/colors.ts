/**
 * ABSHER TRAVEL — Premium Luxury Travel Brand Palette
 * 
 * Brand Colors (from logo):
 *   Navy  #0A2342  (dark navy square background)
 *   Gold  #D4AF37  (border, "A" arrow, text)
 *   Cyan  #38BDF8  (airplane icon accent — sky blue)
 * 
 * Light mode → white canvas, navy actions, gold highlights, cyan accents
 * Dark  mode → deep-navy canvas, gold primary, cyan accents
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
    secondary:        '#38BDF8',        // cyan  → airplane icons, links, secondary actions
    secondaryForeground: '#FFFFFF',
    accent:           '#D4AF37',        // gold  → badges, highlights, active tab, CTAs
    accentForeground: '#0A2342',
    // Semantic
    success:          '#16A34A',
    warning:          '#EAB308',
    destructive:      '#EF4444',
    destructiveForeground: '#FFFFFF',
    // Icon-container tints (match logo palette)
    iconBg:           '#EBF0F8',        // subtle navy tint
    goldTint:         '#FBF6E4',        // subtle gold tint
    cyanTint:         '#E0F2FE',        // subtle cyan tint
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
    secondary:        '#38BDF8',        // cyan accent
    secondaryForeground: '#FFFFFF',
    accent:           '#D4AF37',        // gold
    accentForeground: '#0A2342',
    success:          '#22C55E',
    warning:          '#EAB308',
    destructive:      '#EF4444',
    destructiveForeground: '#FFFFFF',
    iconBg:           'rgba(212,175,55,0.14)',  // subtle gold tint
    goldTint:         'rgba(212,175,55,0.18)',
    cyanTint:         'rgba(56,189,248,0.14)',
    text:             '#F1F5F9',
    tint:             '#D4AF37',
  },
  // ── static brand tokens (same in both modes) ──
  navy:   '#0A2342',
  gold:   '#D4AF37',
  cyan:   '#38BDF8',
  blue:   '#2563EB',
  radius: 12,
};

export default colors;
