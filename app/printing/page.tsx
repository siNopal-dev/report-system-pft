import { requireUser } from '../../lib/page-auth';
import PrintingInput from '../../components/printing-input';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await requireUser();

  if (user.access_role !== 'printing' && user.access_role !== 'all') {
    const { redirect } = await import('next/navigation');
    redirect('/finishing');
  }
  return <PrintingInput username={user.username} role={user.access_role} />;
}
