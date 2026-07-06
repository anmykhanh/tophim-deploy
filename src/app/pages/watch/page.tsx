import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';

interface PageProps {
  searchParams: Promise<{ id?: string; ep?: string }>;
}

export default async function WatchRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const idStr = params.id;
  const epStr = params.ep;

  if (!idStr) {
    redirect('/');
  }

  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    notFound();
  }

  const movie = await prisma.movies.findUnique({
    where: { id },
    select: { slug: true }
  });

  if (!movie) {
    notFound();
  }

  if (epStr) {
    redirect(`/xem/${movie.slug}?ep=${epStr}`);
  } else {
    redirect(`/xem/${movie.slug}`);
  }
}
