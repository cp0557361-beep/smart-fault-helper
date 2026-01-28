import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Send, 
  RotateCcw, 
  Clock, 
  MapPin,
  Lightbulb,
  History,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceCaptureButton, VoiceWaveform } from './VoiceCaptureButton';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useReportContext } from '@/hooks/useReportContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SmartCaptureFormProps {
  machineId: string;
  machineName: string;
  machineType: string;
  lineId: string;
  lineName: string;
  areaId: string;
  areaName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FaultType {
  id: string;
  name: string;
  category: string;
}

interface RecentFault {
  id: string;
  description: string;
  ai_classified_fault: string;
  created_at: string;
}

export function SmartCaptureForm({
  machineId,
  machineName,
  machineType,
  lineId,
  lineName,
  areaId,
  areaName,
  onSuccess,
  onCancel,
}: SmartCaptureFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { saveContext, saveToHistory } = useReportContext();
  
  const [description, setDescription] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [aiClassification, setAiClassification] = useState<string | null>(null);
  const [selectedFaultType, setSelectedFaultType] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [faultTypes, setFaultTypes] = useState<FaultType[]>([]);
  const [recentFaults, setRecentFaults] = useState<RecentFault[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const { isListening, transcript, isSupported, toggleListening } = useVoiceRecognition({
    onResult: (text) => {
      setVoiceText(prev => prev + ' ' + text);
    },
    onError: (error) => {
      toast({
        title: 'Error de voz',
        description: error,
        variant: 'destructive',
      });
    },
  });

  // Load fault types and recent faults
  useEffect(() => {
    const loadData = async () => {
      // Load fault types
      const { data: faults } = await supabase
        .from('fault_types')
        .select('id, name, category')
        .eq('is_active', true)
        .order('category');
      
      if (faults) setFaultTypes(faults);

      // Load recent faults for this machine
      const { data: recent } = await supabase
        .from('event_logs')
        .select('id, description, ai_classified_fault, created_at')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (recent) setRecentFaults(recent);

      // Generate suggestions based on time of day
      const hour = new Date().getHours();
      const timeSuggestions: string[] = [];
      
      if (hour >= 6 && hour <= 8) {
        timeSuggestions.push('Pasta fría', 'Arranque de línea');
      } else if (hour >= 12 && hour <= 14) {
        timeSuggestions.push('Cambio de turno');
      }
      
      // Add machine-type specific suggestions
      if (machineType.includes('Pick')) {
        timeSuggestions.push('Error de Pick-up', 'Feeder atascado');
      } else if (machineType.includes('SPI')) {
        timeSuggestions.push('Pasta insuficiente', 'Stencil sucio');
      }
      
      setSuggestions(timeSuggestions);
    };

    loadData();
  }, [machineId, machineType]);

  // Process voice text with AI when voice capture stops
  useEffect(() => {
    if (!isListening && voiceText.trim()) {
      processWithAI(voiceText.trim());
    }
  }, [isListening]);

  const processWithAI = async (text: string) => {
    setIsProcessingAI(true);
    
    try {
      // Call edge function for AI classification
      const { data, error } = await supabase.functions.invoke('classify-fault', {
        body: { text, machineType },
      });

      if (error) throw error;

      if (data?.classification) {
        setAiClassification(data.classification);
        
        // Try to match with existing fault types
        const matchedFault = faultTypes.find(f => 
          f.name.toLowerCase().includes(data.classification.toLowerCase()) ||
          data.classification.toLowerCase().includes(f.name.toLowerCase())
        );
        
        if (matchedFault) {
          setSelectedFaultType(matchedFault.id);
        }
      }

      // If AI couldn't classify, save to glossary_learning
      if (data?.isUnknown) {
        await supabase.from('glossary_learning').insert({
          term: text,
          occurrences: 1,
        });
      }
    } catch (error) {
      console.error('AI processing error:', error);
      // Fallback: just use the voice text as description
      setDescription(prev => prev ? `${prev}\n${text}` : text);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress and resize image
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
              setPhotoFile(compressedFile);
              setPhotoPreview(URL.createObjectURL(blob));
            }
          }, 'image/jpeg', 0.8);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      let photoUrl = null;

      // Upload photo if exists
      if (photoFile) {
        const fileName = `${user.id}/${Date.now()}_${photoFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evidence-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('evidence-photos')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

      // Create event log
      const { error } = await supabase.from('event_logs').insert({
        operator_id: user.id,
        area_id: areaId,
        production_line_id: lineId,
        machine_id: machineId,
        fault_type_id: selectedFaultType,
        raw_voice_text: voiceText || null,
        ai_classified_fault: aiClassification,
        description: description || voiceText || aiClassification,
        photo_url: photoUrl,
        status: 'open',
      });

      if (error) throw error;

      // Save context for future quick access
      saveContext(areaId, lineId, machineId);
      saveToHistory({
        areaId,
        areaName,
        lineId,
        lineName,
        machineId,
        machineName,
      });

      toast({
        title: '¡Reporte enviado!',
        description: 'La falla ha sido registrada exitosamente.',
      });

      onSuccess();
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el reporte. Intente nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setDescription(prev => prev ? `${prev}. ${suggestion}` : suggestion);
    setAiClassification(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-foreground">Reportar Falla</h2>
            <p className="text-sm text-muted-foreground">{machineName} • {lineName}</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-filled info */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-sm">
            <Clock className="w-3.5 h-3.5" />
            {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-sm">
            <MapPin className="w-3.5 h-3.5" />
            {areaName}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6 pb-32">
        {/* Voice Capture Section */}
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Presiona el micrófono y describe la falla
          </p>
          
          <div className="flex flex-col items-center gap-4">
            <VoiceCaptureButton
              isListening={isListening}
              isProcessing={isProcessingAI}
              isSupported={isSupported}
              onClick={toggleListening}
            />
            
            {isListening && (
              <div className="animate-fade-in">
                <VoiceWaveform isActive={isListening} />
                <p className="text-sm text-primary mt-2">Escuchando...</p>
              </div>
            )}
          </div>

          {/* Voice transcript */}
          {voiceText && (
            <div className="p-4 rounded-lg bg-secondary/50 border border-border text-left animate-fade-in">
              <p className="text-sm text-muted-foreground mb-1">Transcripción:</p>
              <p className="text-foreground">{voiceText}</p>
            </div>
          )}

          {/* AI Classification */}
          {aiClassification && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-left animate-scale-in">
              <p className="text-sm text-primary mb-1">Clasificación IA:</p>
              <p className="text-lg font-semibold text-foreground">{aiClassification}</p>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && !voiceText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lightbulb className="w-4 h-4" />
              <span className="text-sm">Sugerencias</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 text-sm transition-colors touch-manipulation"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent faults for this machine */}
        {recentFaults.length > 0 && !voiceText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <History className="w-4 h-4" />
              <span className="text-sm">Historial reciente de esta máquina</span>
            </div>
            <div className="space-y-2">
              {recentFaults.map((fault) => (
                <button
                  key={fault.id}
                  onClick={() => handleSuggestionClick(fault.ai_classified_fault || fault.description || '')}
                  className="w-full p-3 rounded-lg bg-secondary/50 hover:bg-secondary text-left transition-colors touch-manipulation"
                >
                  <p className="text-sm font-medium text-foreground">
                    {fault.ai_classified_fault || fault.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(fault.created_at).toLocaleDateString('es-MX')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual description */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Descripción adicional (opcional)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe la falla con más detalle..."
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* Photo capture */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Evidencia fotográfica (opcional)</label>
          
          {photoPreview ? (
            <div className="relative rounded-lg overflow-hidden">
              <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
              <button
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <label className="flex-1 btn-industrial btn-industrial-secondary flex items-center justify-center gap-2 cursor-pointer">
                <Camera className="w-5 h-5" />
                <span>Tomar Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </label>
              <label className="flex-1 btn-industrial btn-industrial-secondary flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                <span>Subir</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur border-t border-border safe-area-inset lg:left-64">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={onCancel}
            className="flex-1 btn-industrial"
          >
            Cancelar
          </Button>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || (!voiceText && !description && !aiClassification)}
            className="flex-1 btn-industrial btn-industrial-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Enviar Reporte
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
