'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { QRService } from '@/lib/qr-service';
import { CertificateQRCodeProps, QRCodeData } from '@/types/qr-code';

interface QRCodeComponentProps {
  data: QRCodeData;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
  onError?: (error: Error) => void;
}

export function QRCodeComponent({
  data,
  size = 150,
  level = 'M',
  includeMargin = true,
  className = '',
  onError
}: QRCodeComponentProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const dataUrl = await QRService.generateQRDataURL({
          data,
          size,
          level,
          includeMargin
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, [data, size, level, includeMargin, onError]);

  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-red-50 border border-red-200 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="text-red-500 text-xs text-center">QR Error</div>
      </div>
    );
  }

  return (
    <div className={`inline-block ${className}`}>
      <img 
        src={qrDataUrl} 
        alt="Certificate QR Code"
        style={{ width: size, height: size }}
        className="border border-gray-300"
      />
    </div>
  );
}

interface CertificateQRCodePropsExtended extends CertificateQRCodeProps {
  className?: string;
  onError?: (error: Error) => void;
}

export function CertificateQRCode({
  data,
  size = 150,
  level = 'M',
  includeMargin = true,
  showLabel = true,
  label = '',
  className = '',
  onError
}: CertificateQRCodePropsExtended) {
  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <QRCodeComponent
        data={data}
        size={size}
        level={level}
        includeMargin={includeMargin}
        onError={onError}
      />
      {showLabel && (
        <span className="text-xs text-gray-600 text-center font-medium">
          {label}
        </span>
      )}
    </div>
  );
}

// Hook for generating QR code data URL for PDF embedding
export function useQRCodeDataUrl(data: QRCodeData, options?: {
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const dataUrl = await QRService.generateQRDataURL({
          data,
          size: options?.size || 150,
          level: options?.level || 'M',
          includeMargin: options?.includeMargin !== false
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (data.certificateId && data.verificationUrl) {
      generateQR();
    }
  }, [data, options?.size, options?.level, options?.includeMargin]);

  return { qrDataUrl, isLoading, error };
}

// Memoized QR code component for performance
export const MemoizedQRCode = React.memo(QRCodeComponent);
export const MemoizedCertificateQRCode = React.memo(CertificateQRCode);
