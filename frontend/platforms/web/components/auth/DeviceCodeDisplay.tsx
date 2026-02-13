'use client';

import { useEffect, useState } from 'react';

interface DeviceCodeDisplayProps {
  code: string | null;
  status: string;
  expiresIn: number;
  onRequestCode: () => void;
}

export default function DeviceCodeDisplay({
  code,
  status,
  expiresIn,
  onRequestCode,
}: DeviceCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(expiresIn);

  useEffect(() => {
    setTimeLeft(expiresIn);
  }, [expiresIn]);

  useEffect(() => {
    if (timeLeft <= 0 || status !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, status]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const isExpired = status === 'expired' || (timeLeft <= 0 && status === 'pending');
  const isAuthorized = status === 'authorized';

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {isAuthorized ? (
        <>
          <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Device Authorized</h2>
            <p className="text-text-secondary">
              Your TV is now connected. You can close this screen.
            </p>
          </div>
        </>
      ) : isExpired ? (
        <>
          <div className="w-20 h-20 bg-error/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Code Expired</h2>
            <p className="text-text-secondary mb-4">
              The device code has expired. Request a new one to continue.
            </p>
          </div>
          <button
            onClick={onRequestCode}
            className="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 font-medium transition-colors"
          >
            Request New Code
          </button>
        </>
      ) : code ? (
        <>
          <div>
            <p className="text-text-secondary text-sm mb-2">Enter this code on your TV</p>
            <div className="font-mono text-[8rem] leading-none font-bold text-text-primary tracking-[0.3em] select-all">
              {code}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
              <span className="text-text-secondary text-sm">Waiting for authorization...</span>
            </div>
            <p className="text-text-muted text-sm">
              Code expires in <span className="text-text-secondary font-medium">{formattedTime}</span>
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="text-text-secondary">
            Generate a code to pair your TV with your account.
          </p>
          <button
            onClick={onRequestCode}
            className="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 font-medium transition-colors"
          >
            Generate Code
          </button>
        </>
      )}
    </div>
  );
}
