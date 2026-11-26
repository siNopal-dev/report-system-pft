import { redirect } from 'next/navigation';
import { requireUser } from '../lib/page-auth';
import RecipeScan from '../components/recipe-scan';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const user = await requireUser();
  if (user.access_role !== 'all') redirect(user.access_role === 'printing' ? '/printing' : '/finishing');

  const { edit } = await searchParams;

  return <RecipeScan username={user.username} role={user.access_role} editId={edit || null} />;
}
