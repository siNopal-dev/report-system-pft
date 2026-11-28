import {requireUser} from '../../../lib/page-auth';
import {finishingAllowed} from '../../../lib/finishing';
import FinishingReport from '../../../components/finishing-report';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireUser();if(!finishingAllowed(user))return <p role="alert">Akses ditolak.</p>;return <FinishingReport/>}
