'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to status page as default admin landing
    router.replace('/admin/status');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to admin dashboard...</p>
      </div>
    </div>
  );
}