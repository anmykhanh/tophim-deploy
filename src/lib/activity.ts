import prisma from './db';

/**
 * Tracks a visitor's activity.
 * If user is logged in, tracks them as a member. Otherwise as a guest (by IP).
 */
export async function trackVisitorActivity(userId?: number | null, ipAddress?: string) {
  try {
    const cleanIp = ipAddress || '127.0.0.1';
    
    // If member, sessionId starts with user_. If guest, guest_
    const sessionId = userId ? `user_${userId}` : `guest_${cleanIp}`;
    const isMember = !!userId;

    try {
      await prisma.active_sessions.upsert({
        where: { session_id: sessionId },
        update: {
          user_id: userId || null,
          ip_address: cleanIp,
          last_active: new Date(),
          is_member: isMember
        },
        create: {
          session_id: sessionId,
          user_id: userId || null,
          ip_address: cleanIp,
          last_active: new Date(),
          is_member: isMember
        }
      });
    } catch (dbErr: any) {
      // If concurrent request created the record first, retry with update
      if (dbErr.code === 'P2002') {
        await prisma.active_sessions.update({
          where: { session_id: sessionId },
          data: {
            user_id: userId || null,
            ip_address: cleanIp,
            last_active: new Date(),
            is_member: isMember
          }
        }).catch(() => {});
      } else {
        throw dbErr;
      }
    }
  } catch (err) {
    console.error('Failed to track visitor activity:', err);
  }
}

/**
 * Performs cleanup of stale sessions.
 * Guests older than 30 mins are removed.
 * Members older than 24 hours are removed.
 */
export async function cleanupSessions() {
  try {
    const now = Date.now();
    const thirtyMinsAgo = new Date(now - 30 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

    // Delete guests older than 30 mins
    await prisma.active_sessions.deleteMany({
      where: {
        is_member: false,
        last_active: { lt: thirtyMinsAgo }
      }
    });

    // Delete members older than 24 hours
    await prisma.active_sessions.deleteMany({
      where: {
        is_member: true,
        last_active: { lt: twentyFourHoursAgo }
      }
    });
  } catch (err) {
    console.error('Failed to cleanup active sessions:', err);
  }
}
