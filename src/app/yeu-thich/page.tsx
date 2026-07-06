import { redirect } from 'next/navigation';

export default function FavoriteRedirectPage() {
  redirect('/thu-vien?tab=favorite');
}
