import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNotificationBar } from './TopNotificationBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';

const PageContentSkeleton: React.FC = () => (
  <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-6">
    <div className="h-4 w-48 bg-surface-soft rounded" />
    <div className="h-10 w-72 bg-surface-soft rounded-lg" />
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-80 bg-surface-soft rounded-2xl border border-hairline-soft" />
      ))}
    </div>
  </div>
);

export const StorefrontLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink pb-14 md:pb-0 overflow-x-hidden w-full max-w-[100vw]">
      <TopNotificationBar />
      <Header />

      <main className="flex-1">
        <Suspense fallback={<PageContentSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};
