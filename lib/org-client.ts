export function getOrgSlug() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const org = params.get('org');
    if (org) return org;
    
    const matches = document.cookie.match(/(?:^|;)\s*orgSlug=([^;]+)/);
    if (matches) return decodeURIComponent(matches[1]);
  }
  return 'default';
}

export function applyOrg<T>(queryBuilder: T): T {
  const org = getOrgSlug();
  // @ts-ignore
  return queryBuilder.eq('org_id', org);
}
