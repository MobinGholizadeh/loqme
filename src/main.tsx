import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { SmoothScrollProvider } from '../components/smooth-scroll-provider';
import Storefront from './storefront';
import './globals.css';

const OrderPage = lazy(() => import('./order'));
const isOrder = /^\/order(?:\/|\.html)?$/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <SmoothScrollProvider>
    <Suspense fallback={<main style={{ padding: 40 }}>Loading your order…</main>}>
      {isOrder ? <OrderPage /> : <Storefront />}
    </Suspense>
  </SmoothScrollProvider>,
);
