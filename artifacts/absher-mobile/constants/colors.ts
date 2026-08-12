/**
 * ABSHER TRAVEL — Premium Luxury Travel Brand Palette (Redesign Phase 1)
 */

const staticColors = {
  primaryNavy: '#062B5B',
  secondaryBlue: '#0D4A8C',
  premiumGold: '#D4A017',
  premiumGoldActive: '#F4C542',
  umrahGreen: '#0B5E3B',
  skyBlue: '#38BDF8',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  
  // Legacy adapter tokens (to keep existing screens compiling)
  navy: '#062B5B',
  gold: '#D4A017',
  cyan: '#0D4A8C', 
  radius: 12,
};

const light = {
  // New tokens
  background: '#F7F9FC',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  primary: '#062B5B', // Navy
  primaryActive: '#0D4A8C', // Secondary Blue
  accent: '#D4A017',  // Gold
  accentActive: '#F4C542',
  success: staticColors.success,
  warning: staticColors.warning,
  error: staticColors.error,
  umrahGreen: staticColors.umrahGreen,
  skyBlue: staticColors.skyBlue,
  
  // Legacy adapter tokens
  foreground: '#0F172A',
  cardForeground: '#0F172A',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  input: '#E2E8F0',
  primaryForeground: '#FFFFFF',
  secondary: '#0D4A8C',
  secondaryForeground: '#FFFFFF',
  accentForeground: '#062B5B',
  destructive: staticColors.error,
  destructiveForeground: '#FFFFFF',
  iconBg: '#EBF0F8',
  goldTint: '#FBF6E4',
  cyanTint: '#E0F2FE',
  tint: '#062B5B',
};

const dark = {
  // New tokens
  background: '#031B3A',
  card: '#062B5B',
  text: '#FFFFFF',
  textSecondary: '#CBD5E1',
  border: '#0D4A8C', // Soft border in dark
  primary: '#D4A017', // Gold becomes primary in dark mode for contrast
  primaryActive: '#F4C542',
  accent: '#D4A017',
  accentActive: '#F4C542',
  success: staticColors.success,
  warning: staticColors.warning,
  error: staticColors.error,
  umrahGreen: staticColors.umrahGreen,
  skyBlue: staticColors.skyBlue,
  
  // Legacy adapter tokens
  foreground: '#FFFFFF',
  cardForeground: '#FFFFFF',
  muted: '#0D4A8C',
  mutedForeground: '#CBD5E1',
  input: '#0D4A8C',
  primaryForeground: '#062B5B',
  secondary: '#38BDF8',
  secondaryForeground: '#FFFFFF',
  accentForeground: '#062B5B',
  destructive: staticColors.error,
  destructiveForeground: '#FFFFFF',
  iconBg: 'rgba(212,160,23,0.14)',
  goldTint: 'rgba(212,160,23,0.18)',
  cyanTint: 'rgba(13,74,140,0.14)',
  tint: '#D4A017',
};

const colors = {
  light,
  dark,
  static: staticColors,
  ...staticColors, // Top-level for backwards compat if used directly (e.g. colors.navy)
};

export default colors;
