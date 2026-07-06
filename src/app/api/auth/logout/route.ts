import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('user_id');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Logout API error:', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đăng xuất!' }, { status: 500 });
  }
}
