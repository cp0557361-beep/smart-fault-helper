import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceCaptureButtonProps {
  isListening: boolean;
  isProcessing?: boolean;
  isSupported: boolean;
  onClick: () => void;
  className?: string;
}

export function VoiceCaptureButton({
  isListening,
  isProcessing = false,
  isSupported,
  onClick,
  className,
}: VoiceCaptureButtonProps) {
  if (!isSupported) {
    return (
      <div className={cn(
        'voice-button opacity-50 cursor-not-allowed',
        className
      )}>
        <MicOff className="w-8 h-8" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={isProcessing}
      className={cn(
        'voice-button',
        isListening && 'voice-button-recording',
        isProcessing && 'opacity-70 cursor-wait',
        className
      )}
      aria-label={isListening ? 'Detener grabación' : 'Iniciar grabación por voz'}
    >
      {isProcessing ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : isListening ? (
        <MicOff className="w-8 h-8" />
      ) : (
        <Mic className="w-8 h-8" />
      )}
    </button>
  );
}

// Waveform visualization component
export function VoiceWaveform({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 bg-primary rounded-full transition-all',
            isActive ? 'animate-pulse' : 'h-2'
          )}
          style={{
            height: isActive ? `${Math.random() * 24 + 8}px` : '8px',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
