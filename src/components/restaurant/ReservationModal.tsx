import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRestaurantStore } from '@/store/restaurant-store';
import { TableWithStatus } from '@/types/restaurant';

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  table: TableWithStatus;
}

export function ReservationModal({ open, onClose, table }: ReservationModalProps) {
  const { createReservation } = useRestaurantStore();

  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const defaultDuration = table.isVIP ? 120 : 90;

  const [startTime, setStartTime] = useState(defaultTime);
  const [duration, setDuration] = useState(defaultDuration);
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      setError('El nombre del cliente es requerido.');
      return;
    }

    setLoading(true);
    setError('');

    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0];

    // For VIP merged tables, include both A and B
    let tableIds = [table.id];
    if (table.canMerge && table.mergeGroup === 'VIP_AB') {
      // Check if we should merge - this is simplified; in real app, ask user
      tableIds = [table.id];
    }

    try {
      await createReservation({
        tableIds,
        clientName: clientName.trim(),
        partySize: table.capacity,
        date: today,
        startTime,
        endTime,
        status: 'confirmed',
        duration,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear reserva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Reservar — {table.name} ({table.capacity}p)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hora inicio</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Duración (min)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={30}
                max={300}
                step={15}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nombre del cliente *</Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ej: García López"
              className="bg-secondary border-border"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional..."
              className="bg-secondary border-border"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-primary text-primary-foreground">
            {loading ? 'Creando...' : 'Confirmar Reserva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
