import { redirect } from 'next/navigation';

export default function WatchLaterRedirectPage() {
  redirect('/thu-vien?tab=watch_later');
}
