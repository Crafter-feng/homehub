/**
 * Feature flags configuration
 * Controls which modules are enabled/disabled
 */

export interface FeatureFlags {
  stock: boolean;
  recipes: boolean;
  mealPlans: boolean;
  shoppingLists: boolean;
  calendar: boolean;
  budget: boolean;
  hardware: boolean;
  iotTags: boolean;
  admin: boolean;
  mcp: boolean;
  backup: boolean;
}

const defaultFlags: FeatureFlags = {
  stock: true,
  recipes: true,
  mealPlans: true,
  shoppingLists: true,
  calendar: true,
  budget: true,
  hardware: true,
  iotTags: true,
  admin: true,
  mcp: true,
  backup: true,
};

// Load from localStorage or use defaults
function loadFlags(): FeatureFlags {
  try {
    const stored = localStorage.getItem('hh_feature_flags');
    if (stored) {
      return { ...defaultFlags, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...defaultFlags };
}

let currentFlags = loadFlags();

export function getFeatureFlags(): FeatureFlags {
  return { ...currentFlags };
}

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return currentFlags[feature] ?? true;
}

export function setFeatureFlag(feature: keyof FeatureFlags, enabled: boolean): void {
  currentFlags[feature] = enabled;
  localStorage.setItem('hh_feature_flags', JSON.stringify(currentFlags));
}

export function resetFeatureFlags(): void {
  currentFlags = { ...defaultFlags };
  localStorage.removeItem('hh_feature_flags');
}
