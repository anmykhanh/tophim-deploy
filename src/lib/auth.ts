import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';

const secretKey = process.env.JWT_SECRET || 'hubphim-super-secret-key-change-me-in-production';
const encodedKey = new TextEncoder().encode(secretKey);

export async function signToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

export async function verifyToken(token: string | undefined = '') {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as { userId: number; role: string; [key: string]: any };
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function checkAdmin() {
  const session = await getSession();
  if (!session || !session.userId) return false;
  
  const user = await prisma.users.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });
  
  return user?.role === 'admin';
}

export async function checkPermissions(requiredPermission?: string | string[]) {
  const session = await getSession();
  if (!session || !session.userId) return false;

  const user = await prisma.users.findUnique({
    where: { id: session.userId },
    select: { 
      role: true, 
      roles: {
        select: { permissions: true }
      }
    }
  });

  if (!user) return false;

  // Super Admin bypass
  if (user.role === 'admin') return true;

  // If no specific permission is required, just check if they have any access to admin panel
  // (which means they have a custom role)
  if (!requiredPermission) {
    return user.role === 'user' && user.roles !== null;
  }

  // Check specific permission
  if (user.roles?.permissions) {
    try {
      const perms = Array.isArray(user.roles.permissions) ? user.roles.permissions : JSON.parse(user.roles.permissions as string);
      
      if (Array.isArray(requiredPermission)) {
        return requiredPermission.some(p => perms.includes(p));
      } else {
        return perms.includes(requiredPermission);
      }
    } catch (e) {
      return false;
    }
  }

  return false;
}
