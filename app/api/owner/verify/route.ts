import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (process.env.OWNER_PASSWORD && password === process.env.OWNER_PASSWORD) {
      return NextResponse.json({ ok: true });
    }
    // Fallback if not set in environment yet during setup
    if (!process.env.OWNER_PASSWORD && password === 'supersecretowner123') {
       return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to verify' }, { status: 500 });
  }
}
