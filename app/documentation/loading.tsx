import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingIndicator message="Memuat dokumentasi..." />
    </div>
  );
}
