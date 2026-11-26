import './globals.css';

export const metadata = {
  title: 'Report System',
  description: 'Laporan finishing, resep FA, dan printing',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
