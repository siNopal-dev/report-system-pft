import { redirect } from 'next/navigation';
import { currentUser } from '../../lib/auth';
import LoginForm from '../../components/login-form';

export const dynamic = 'force-dynamic';

export default async function Login() {
  // A stale cookie must not prevent opening the login screen during configuration.
  let user = null;

  try {
    user = await currentUser();
  } catch {}

  if (user) {
    redirect(
      user.access_role === 'all'
        ? '/'
        : user.access_role === 'printing'
          ? '/printing'
          : '/finishing',
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/logo-pft.jpg" alt="PFT" />
          <strong>Report System</strong>
          <small>PT. PRIMA FARA TEXTILE</small>
        </div>

        <h1>Selamat datang</h1>
        <p>Masuk untuk mengelola laporan produksi.</p>

        <LoginForm />
      </div>
    </div>
  );
}
