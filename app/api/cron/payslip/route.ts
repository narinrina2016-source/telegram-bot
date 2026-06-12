import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Telegraf } from 'telegraf';
import { format, startOfMonth, endOfMonth, parseISO, differenceInMinutes, subMonths } from 'date-fns';

const bot = process.env.TELEGRAM_BOT_TOKEN 
  ? new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
  : null;

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export async function GET(req: Request) {
  // Simple cron authorization can be added using a custom header check:
  // if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) { return new Response('Unauthorized', {status: 401}) }

  if (!bot || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Config missing' }, { status: 500 });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    // Usually payslip at 25th of month evaluates the CURRENT month, or PREVIOUS month depending on rules. Let's do CURRENT month up to today
    const reportMonth = format(new Date(), 'yyyy-MM');
    const start = startOfMonth(parseISO(`${reportMonth}-01`)).toISOString();
    const end = endOfMonth(parseISO(`${reportMonth}-01`)).toISOString();

    const { data: employees } = await supabaseAdmin.from('employees').select('*').eq('active', true).range(0, 999);
    const { data: orgs } = await supabaseAdmin.from('organizations').select('*');
    const orgMap: Record<string, any> = {};
    if (orgs) {
      orgs.forEach(o => orgMap[o.slug] = o);
    }

    const { data: attendance } = await supabaseAdmin.from('attendance').select('*').gte('recorded_at', start).lte('recorded_at', end).range(0, 9999);
    const { data: adjustments } = await supabaseAdmin.from('payroll_adjustments').select('*').eq('month', reportMonth).range(0, 9999);
    const { data: timesheets } = await supabaseAdmin.from('timesheets').select('*').gte('work_date', format(parseISO(start), 'yyyy-MM-dd')).lte('work_date', format(parseISO(end), 'yyyy-MM-dd')).range(0, 9999);

    if (employees) {
      let sentCount = 0;
      for (const emp of employees) {
        if (!emp.telegram_id) continue;

        const empRecords = attendance?.filter(a => 
           (a.employee_code === emp.employee_code && !a.substitute_for) || 
           (a.substitute_for === emp.employee_code)
        ) || [];
        const empAdjustments = adjustments?.filter(a => a.employee_code === emp.employee_code) || [];
        const empTimesheets = timesheets?.filter(t => t.employee_code === emp.employee_code) || [];
        
        let totalMinutesOffices = 0;
        let daysWorked = 0;
        let lateDays = 0;
        
        let workStart = '08:00';
        if (orgMap[emp.org_id]?.settings?.work_start_time) {
           workStart = orgMap[emp.org_id].settings.work_start_time;
        }

        const byDay: Record<string, any[]> = {};
        empRecords.forEach(r => {
          const dateStr = format(parseISO(r.recorded_at), 'yyyy-MM-dd');
          if (!byDay[dateStr]) byDay[dateStr] = [];
          byDay[dateStr].push(r);
        });

        Object.keys(byDay).forEach(date => {
          const records = byDay[date].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
          const checkIns = records.filter(r => r.check_type === 'in');
          const checkOuts = records.filter(r => r.check_type === 'out');
          
          if (checkIns.length > 0) {
            daysWorked++;
            const firstIn = parseISO(checkIns[0].recorded_at);
            const workStartDT = parseISO(`${date}T${workStart}:00`);
            if (differenceInMinutes(firstIn, workStartDT) > 5) lateDays++;
            
            if (checkOuts.length > 0) {
               const lastOut = parseISO(checkOuts[checkOuts.length - 1].recorded_at);
               const mins = differenceInMinutes(lastOut, firstIn);
               if (mins > 0) totalMinutesOffices += mins;
            }
          }
        });

        let totalHours = totalMinutesOffices / 60;
        let grossPay = 0;

        if (emp.payroll_type === 'hourly') {
           let tsHours = empTimesheets.reduce((acc, t) => acc + Number(t.hours_worked || 0), 0);
           if (tsHours > 0) {
               totalHours = tsHours;
           }
           grossPay = totalHours * (emp.hourly_rate || 0);
        } else {
           grossPay = emp.base_salary || 0;
        }

        let netAdditions = 0;
        let netDeductions = 0;
        empAdjustments.forEach(adj => {
           if (adj.adj_type === 'addition') netAdditions += Number(adj.amount);
           if (adj.adj_type === 'deduction') netDeductions += Number(adj.amount);
        });

        const netPay = grossPay + netAdditions - netDeductions;

        const message = `
*PAYSLIP / ប័ណ្ណប្រាក់ខែ*
**Month:** ${reportMonth}
------------------------
*Name:* ${emp.name}
*ID:* ${emp.employee_code}
*Type:* ${emp.payroll_type === 'monthly' ? 'Monthly' : 'Hourly'}

*Summary:*
Worked: ${daysWorked} days
Hours: ${totalHours.toFixed(1)} hrs
Late: ${lateDays} times

*Earnings:*
Gross Pay: $${grossPay.toFixed(2)}
Additions: $${netAdditions.toFixed(2)}
Deductions: -$${netDeductions.toFixed(2)}

*NET PAY:* $${netPay.toFixed(2)}
------------------------
`;

        try {
          await bot.telegram.sendMessage(emp.telegram_id, message, { parse_mode: 'Markdown' });
          sentCount++;
        } catch (e) {
          console.error(`Failed to send to ${emp.telegram_id}`, e);
        }
      }
      return NextResponse.json({ ok: true, sentCount });
    }

    return NextResponse.json({ ok: true, sentCount: 0 });
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
