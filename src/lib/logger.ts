import prisma from './db';

/**
 * Logs a user action and updates their last known IP address.
 * 
 * @param userId - The ID of the user performing the action
 * @param action - A summary of the action (e.g. "Đăng nhập")
 * @param details - Optional detailed description of the action
 * @param ipAddress - Optional client IP address
 */
export async function logUserActivity(
  userId: number,
  action: string,
  details?: string,
  ipAddress?: string
) {
  try {
    // Check if user is an admin
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    const isAdmin = user?.role === 'admin';
    const cleanIp = isAdmin ? null : (ipAddress || '127.0.0.1');

    // 1. Create the log entry
    await prisma.user_logs.create({
      data: {
        user_id: userId,
        action,
        details: details || null,
        ip_address: cleanIp,
      },
    });

    // 2. Update last IP for the user
    await prisma.users.update({
      where: { id: userId },
      data: {
        last_ip: cleanIp,
      },
    });
  } catch (err) {
    console.error('Failed to log user activity:', err);
  }
}
