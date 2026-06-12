import { Telegraf } from 'telegraf';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const botOptions = process.env.TELEGRAM_BOT_TOKEN 
  ? { telegram: { webhookReply: true } } 
  : undefined;

const bot = process.env.TELEGRAM_BOT_TOKEN 
  ? new Telegraf(process.env.TELEGRAM_BOT_TOKEN, botOptions)
  : null;

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

// Admin commands
if (bot) {
  bot.start((ctx) => {
    const appUrl = process.env.APP_URL || 'https://example.com';
    ctx.reply(
      'សួស្តី! សូមស្វាគមន៍មកកាន់ SecureAttend Bot។ (Welcome to SecureAttend Bot!)\n\n' +
      'សូមចុចប៊ូតុងខាងក្រោមដើម្បីបើកកម្មវិធីកត់ត្រាវត្តមាន។',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'បើកកម្មវិធី (Open App)', web_app: { url: appUrl } }]
          ]
        }
      }
    );
  });

  bot.command('link', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('សូមបញ្ចូលលេខកូដបុគ្គលិក។ ឧទាហរណ៍៖ /link EMP001');
    }

    const employeeCode = args[1];
    const telegramId = ctx.from.id.toString();

    if (!supabaseUrl || !supabaseServiceKey) {
       return ctx.reply('ភ្ជាប់មិនជោគជ័យ។ (Not configured).');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabaseAdmin
      .from('employees')
      .update({ telegram_id: telegramId })
      .eq('employee_code', employeeCode)
      .select()
      .single();

    if (error || !data) {
      return ctx.reply('រកមិនឃើញលេខកូដបុគ្គលិកនេះទេ។ ត្រូវប្រាកដថាអ្នកបានចុះឈ្មោះ។');
    }

    ctx.reply(`✅ ជោគជ័យ! Telegram របស់អ្នកបានភ្ជាប់ជាមួយគណនីបុគ្គលិក [${data.name}].`);
  });
}

export async function POST(req: NextRequest) {
  if (!bot) {
    return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 });
  }
  
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Bot Error:', error);
    return NextResponse.json({ error: 'Failed to handle update' }, { status: 500 });
  }
}
