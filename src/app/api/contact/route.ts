import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc!' }, { status: 400 });
    }

    const newContact = await prisma.contacts.create({
      data: {
        name,
        email,
        subject: subject || null,
        message,
        status: 'pending'
      }
    });

    return NextResponse.json({ success: true, message: 'Đã gửi lời nhắn liên hệ thành công!', contact: newContact });
  } catch (err: any) {
    console.error("Failed to create contact message:", err);
    return NextResponse.json({ error: 'Lỗi hệ thống khi gửi liên hệ!' }, { status: 500 });
  }
}
