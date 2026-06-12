import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
supabaseUrl = supabaseUrl.trim().replace(/\/+$/, '');

const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

