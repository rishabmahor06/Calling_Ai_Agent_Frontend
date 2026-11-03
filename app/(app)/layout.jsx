'use client';
import { AuthProvider } from '@/lib/auth';
import { SocketProvider } from '@/lib/socket';
import { ToastProvider } from '@/components/ui';
import { Shell } from '@/components/Shell';

export default function AppLayout({ children }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <Shell>{children}</Shell>
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
