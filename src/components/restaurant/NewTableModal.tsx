import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTableDimensions } from '@/lib/table-dimensions';

interface NewTableModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (input: { capacity: 2 | 4 | 6 | 8; type: 'standard' | 'square' }) => Promise<void>;
}

const CAPACITY_OPTIONS: Array<{ value: 2 | 4 | 6 | 8; label: string }> = [
  { value: 2, label: '2 personas' },
  { value: 4, label: '4 personas' },
  { value: 6, label: '6 personas' },
  { value: 8, label: '8 personas' },
];

export function NewTableModal({ open, onClose, onConfirm }: NewTableModalProps) {
  const [capacity, setCapacity] = useState<2 | 4 | 6 | 8>(4);
  const [type, setType] = useState<'standard' | 'square'>('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCapacity(4);
    setType('standard');
    setError(null);
    setLoading(false);
  }, [open]);

  const preview = useMemo(
    () => getTableDimensions({ capacity, type }, false),
    [capacity, type]
  );

  const previewWidth = Math.round(preview.widthRem * 8);
  const previewHeight = Math.round(preview.heightRem * 8);

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm({ capacity, type });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la mesa.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-[94vw] sm:max-w-xl bg-card">
        <DialogHeader>
          <DialogTitle>Nueva mesa</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label>Capacidad</Label>
            <Select value={String(capacity)} onValueChange={(value) => setCapacity(Number(value) as 2 | 4 | 6 | 8)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona capacidad" />
              </SelectTrigger>
              <SelectContent>
                {CAPACITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as 'standard' | 'square')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="square">Square</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground mb-2">
            Tamano visual (segun reglas actuales): {preview.widthRem}rem x {preview.heightRem}rem
          </div>
          <div className="h-32 flex items-center">
            <div
              className="table-available border border-white/20"
              style={{
                width: `${previewWidth}px`,
                height: `${previewHeight}px`,
                borderRadius: preview.roundedClass === 'rounded-full' ? '9999px' : '0.75rem',
              }}
            />
          </div>
        </div>

        {error && (
          <div className="text-xs text-destructive">{error}</div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Creando...' : 'Crear mesa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
