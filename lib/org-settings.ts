import { supabase } from '@/lib/supabase';
import { getOrgSlug } from './org-client';

export async function fetchOrgSettings() {
  const { data } = await supabase.from('organizations').select('settings, attendance_methods').eq('slug', getOrgSlug()).single();
  return {
    settings: data?.settings || {},
    methods: data?.attendance_methods || {}
  };
}

export async function saveOrgSettings(settings: any, methods?: any) {
  const updates: any = {};
  if (settings) updates.settings = settings;
  if (methods) updates.attendance_methods = methods;
  
  await supabase.from('organizations').update(updates).eq('slug', getOrgSlug());
}
