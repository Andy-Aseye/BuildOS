/** Aligns with plan: financial detail for Owner / PM only. */
export function canViewFinancials(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'PROJECT_MANAGER';
}
