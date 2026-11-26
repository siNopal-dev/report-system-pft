import { requireUser } from '../../../lib/page-auth';
import RecipeArchive from '../../../components/recipe-archive';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await requireUser();

  if (user.access_role !== 'all') {
    const { redirect } = await import('next/navigation');
    redirect(user.access_role === 'printing' ? '/printing' : '/finishing');
  }
  return <RecipeArchive username={user.username} role={user.access_role} />;
}
