import { redirect } from 'next/navigation';

export default function HistoryRedirectPage() {
  redirect('/thu-vien?tab=history');
}
