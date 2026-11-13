import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNotificationBar } from './TopNotificationBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';

export const StorefrontLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink pb-14 md:pb-0">
      <TopNotificationBar />
      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};
