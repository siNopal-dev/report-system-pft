'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type MenuItem = {
  label: string;
  href: string;
};

type MenuGroup = {
  heading: string;
  items: MenuItem[];
};

const menu: (MenuGroup & { access: string[] })[] = [
  { heading: 'RESEP FA', access: ['all'], items: [
    {label:'Scan Resep FA',href:'/'},{label:'Arsip Resep',href:'/recipes/archive'} ] },
  { heading: 'PRINTING', access: ['all','printing'], items: [
    {label:'Pencatatan Lost Time',href:'/printing'},{label:'Rekap Lost Time',href:'/printing/recap'} ] },
  { heading: 'FINISHING', access: ['all','finishing','process'], items: [
    {label:'Input Produksi Finishing',href:'/finishing'},{label:'Rekap Produksi Finishing',href:'/finishing/recap'} ] },
];

type AppShellProps = {
  username: string;
  role: string;
  children: ReactNode;
};

export default function AppShell({ username, role, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  async function logout() {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (response.ok) location.assign('/login');
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="menu-toggle"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>
          <a className="brand" href={role === 'printing' ? '/printing' : role === 'all' ? '/' : '/finishing'}>
            <span className="logo-box">
              <img src="/logo-pft.jpg" alt="PFT" />
            </span>
            <span>
              <strong>Report System</strong>
              <small>PT. PRIMA FARA TEXTILE</small>
            </span>
          </a>
          <span className="badge">{username}</span>
          <button className="logout" onClick={logout}>
            Keluar
          </button>
        </div>
      </header>

      {open && (
        <button
          className="overlay"
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={open ? 'sidebar open' : 'sidebar'} inert={!open}>
        <div className="section-head">
          <strong>MENU REPORT SYSTEM</strong>
          <button onClick={() => setOpen(false)} aria-label="Tutup menu">
            ×
          </button>
        </div>

        {menu.filter(group => group.access.includes(role)).map((group) => (
          <div key={group.heading}>
            <p>{group.heading}</p>
            {group.items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={path === item.href ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </aside>

      <main>{children}</main>
    </div>
  );
}
