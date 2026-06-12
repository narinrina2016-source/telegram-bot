import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const { serial, orgId } = await req.json();

    if (!serial) {
      return NextResponse.json({ error: 'No serial provided' }, { status: 400 });
    }

    // Identify employee
    let query = supabase.from('employees').select('employee_code, name, org_id').eq('nfc_serial', serial).eq('active', true);
    if (orgId && orgId !== 'default') {
      query = query.eq('org_id', orgId);
    }
    
    const { data: employee, error: empError } = await query.single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Card not registered or employee inactive.' }, { status: 404 });
    }

    // Determine check in/out state
    // Get latest attendance today
    const today = new Date().toISOString().split('T')[0];
    const { data: lastRecord } = await supabase
      .from('attendance')
      .select('check_type')
      .eq('employee_code', employee.employee_code)
      .gte('recorded_at', `${today}T00:00:00Z`)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    let nextCheckType = 'in';
    if (lastRecord && lastRecord.check_type === 'in') {
      nextCheckType = 'out';
    } else if (lastRecord && lastRecord.check_type === 'out') {
      nextCheckType = 'in';
    }

    // Insert new attendance record
    const { error: insertError } = await supabase.from('attendance').insert({
      org_id: employee.org_id || orgId || 'default',
      employee_code: employee.employee_code,
      method: 'nfc',
      check_type: nextCheckType
    });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to record attendance.' }, { status: 500 });
    }

    const timeStr = format(new Date(), 'hh:mm a');

    return NextResponse.json({ 
      success: true,
      employeeName: employee.name,
      checkType: nextCheckType,
      message: `Successfully checked ${nextCheckType} at ${timeStr}`
    });

  } catch (error: any) {
    console.error('Kiosk API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
