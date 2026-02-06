import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SequenceChipsProps {
  value: string[];
  onChange: (sequences: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SequenceChips({
  value = [],
  onChange,
  placeholder = 'Agregar secuencia...',
  className,
  disabled = false,
}: SequenceChipsProps) {
  const [inputValue, setInputValue] = useState('');

  const addSequence = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  };

  const removeSequence = (seq: string) => {
    onChange(value.filter((s) => s !== seq));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSequence();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-1.5">
        {value.map((seq) => (
          <Badge key={seq} variant="secondary" className="gap-1 pr-1">
            {seq}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeSequence(seq)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addSequence}
            disabled={!inputValue.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
