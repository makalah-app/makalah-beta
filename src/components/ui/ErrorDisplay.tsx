'use client';

/**
 * ErrorDisplay - Component untuk displaying error states dengan proper UX
 *
 * MIGRATED TO SHADCN/UI:
 * - Uses shadcn/ui Alert components untuk consistent error messaging
 * - Button components untuk actions (retry/clear)
 * - Card components untuk detailed error information
 *
 * DESIGN COMPLIANCE:
 * - Error handling patterns yang user-friendly
 * - Consistent dengan academic platform design
 * - Actionable error messages dengan retry functionality
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  error: Error;
  onRetry?: () => void;
  onClear?: () => void;
  className?: string;
  showDetails?: boolean;
  type?: 'inline' | 'card' | 'banner';
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onClear,
  className = '',
  showDetails = false,
  type = 'card',
}) => {
  // Get user-friendly error message
  const getUserFriendlyMessage = (error: Error) => {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'Terjadi masalah koneksi. Periksa koneksi internet Anda dan coba lagi.';
    }

    if (message.includes('timeout')) {
      return 'Permintaan memerlukan waktu terlalu lama. Silakan coba lagi.';
    }

    if (message.includes('rate limit')) {
      return 'Terlalu banyak permintaan dalam waktu singkat. Mohon tunggu sebentar sebelum mencoba lagi.';
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Sesi Anda telah berakhir. Silakan login ulang.';
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
    }

    if (message.includes('not found') || message.includes('404')) {
      return 'Sumber daya yang diminta tidak ditemukan.';
    }

    if (message.includes('server') || message.includes('500')) {
      return 'Terjadi masalah pada server. Tim kami sedang menanganinya.';
    }

    // Default fallback
    return 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi atau hubungi dukungan jika masalah berlanjut.';
  };

  const friendlyMessage = getUserFriendlyMessage(error);

  const getErrorIcon = () => {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return '📡';
    }

    if (message.includes('timeout')) {
      return '⏰';
    }

    if (message.includes('rate limit')) {
      return '🚦';
    }

    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return '🔒';
    }

    return '⚠️'; // Default error icon
  };

  // Get Alert variant based on error type
  const getAlertVariant = () => {
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'default'; // Less aggressive for auth issues
    }

    return 'destructive'; // Standard error styling
  };

  // Handle different display types dengan shadcn/ui Alert variants
  if (type === 'inline') {
    return (
      <Alert variant={getAlertVariant()} className={cn("inline-flex items-center p-2", className)}>
        <span className="text-lg mr-2">{getErrorIcon()}</span>
        <AlertDescription className="text-sm">
          {friendlyMessage}
        </AlertDescription>
        {onClear && (
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="ml-2 h-auto p-1"
          >
            ✕
          </Button>
        )}
      </Alert>
    );
  }

  if (type === 'banner') {
    return (
      <Alert variant={getAlertVariant()} className={cn("border-l-4", className)}>
        <span className="text-lg">{getErrorIcon()}</span>
        <AlertTitle>Oops! Terjadi Kesalahan</AlertTitle>
        <AlertDescription>
          {friendlyMessage}
        </AlertDescription>

        {/* Actions for banner type */}
        {(onRetry || onClear) && (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <Button onClick={onRetry} size="sm">
                🔄 Coba Lagi
              </Button>
            )}
            {onClear && (
              <Button onClick={onClear} variant="outline" size="sm">
                ✕ Tutup
              </Button>
            )}
          </div>
        )}
      </Alert>
    );
  }

  // Default card type - enhanced dengan full features
  return (
    <Alert variant={getAlertVariant()} className={cn("", className)}>
      <span className="text-lg">{getErrorIcon()}</span>
      <AlertTitle>Oops! Terjadi Kesalahan</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          {/* Main error message */}
          <p>{friendlyMessage}</p>

          {/* Error Details (untuk development atau user yang request) */}
          {showDetails && (
            <Card className="mt-3">
              <CardContent className="p-3">
                <details className="cursor-pointer">
                  <summary className="text-sm font-medium mb-2">
                    Detail Teknis (untuk debugging)
                  </summary>
                  <div className="text-sm font-mono space-y-1 text-muted-foreground">
                    <div><strong>Error Type:</strong> {error.name}</div>
                    <div><strong>Message:</strong> {error.message}</div>
                    {error.stack && (
                      <div className="mt-2">
                        <strong>Stack Trace:</strong>
                        <pre className="text-xs mt-1 overflow-x-auto whitespace-pre-wrap">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </CardContent>
            </Card>
          )}

          {/* Error Actions */}
          {(onRetry || onClear) && (
            <div className="flex gap-3 mt-4">
              {onRetry && (
                <Button onClick={onRetry} size="sm">
                  🔄 Coba Lagi
                </Button>
              )}

              {onClear && (
                <Button onClick={onClear} variant="outline" size="sm">
                  ✕ Tutup
                </Button>
              )}
            </div>
          )}

          {/* Help Text */}
          <p className="text-xs text-muted-foreground mt-3">
            💡 Jika masalah ini terus terjadi, silakan hubungi dukungan teknis dengan menyertakan detail error di atas.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ErrorDisplay;