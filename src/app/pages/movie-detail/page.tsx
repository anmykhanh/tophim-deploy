import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function MovieDetailRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const idStr = params.id;
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

  redirect(`/phim/${movie.slug}`);
}
