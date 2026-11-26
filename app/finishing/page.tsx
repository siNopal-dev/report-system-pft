import {Suspense} from 'react';
import {requireUser} from '../../lib/page-auth';
import {allowedSections,finishingAllowed} from '../../lib/finishing';
import FinishingInput from '../../components/finishing-input';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireUser();if(!finishingAllowed(user))return <p role="alert">Akun Anda belum memiliki akses ke halaman yang tersedia.</p>;return <Suspense fallback={<p>Memuat formulir…</p>}><FinishingInput username={user.username} role={user.access_role} sections={allowedSections(user)}/></Suspense>}
