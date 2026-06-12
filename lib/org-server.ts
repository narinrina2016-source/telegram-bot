import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest } from 'next/server';

export function getOrgSlugFromRequest(req: NextRequest) {
  // check url
  const urlOrg = req.nextUrl.searchParams.get('org');
  if (urlOrg) return urlOrg;
  
  // check cookie
  const cookieOrg = req.cookies.get('orgSlug')?.value;
  if (cookieOrg) return cookieOrg;
  
  return 'default';
}
