export const ADMIN_TABS = ['goals', 'team', 'integrations', 'meetings'] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export function isAdminTab(value: string | undefined): value is AdminTab {
  return ADMIN_TABS.includes(value as AdminTab);
}
