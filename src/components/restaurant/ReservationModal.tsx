import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRestaurantStore } from '@/store/restaurant-store';
import { AvailabilitySuggestion, TableWithStatus } from '@/types/restaurant';
import { getLocalDateISO } from '@/lib/date';
import { api } from '@/services/api';
import { hasTableOverlap } from '@/services/domain/reservation-rules';

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  table: TableWithStatus;
  combinedTableIds?: string[];
}

const DURATION_OPTIONS = [
  { value: 90, label: '90 min (estándar)' },
  { value: 120, label: '120 min (VIP/evento)' },
  { value: 180, label: '180 min (VIP/evento)' },
];

const TIME_SLOTS = Array.from({ length: 29 }, (_, index) => {
  const totalMinutes = 10 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

function getDateTimeFrom(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function ReservationModal({ open, onClose, table, combinedTableIds }: ReservationModalProps) {
  const { createReservation, reservations } = useRestaurantStore();

  const isCombined = !!combinedTableIds && combinedTableIds.length === 2;
  const effectiveCapacity = isCombined ? 6 : table.capacity;
  const titleName = isCombined ? 'Cuadrada A + B' : table.name;

  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = getLocalDateISO();
  const defaultDuration = table.isVIP ? 120 : 90;

  const [reservationDate, setReservationDate] = useState(today);
  const [startTime, setStartTime] = useState(defaultTime);
  const [duration, setDuration] = useState(defaultDuration);
  const [clientName, setClientName] = useState('');
  const [partySize, setPartySize] = useState(effectiveCapacity);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<AvailabilitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const tableIds = isCombined ? (combinedTableIds ?? [table.id]) : [table.id];

  const unavailableSlots = useMemo(() => {
    return TIME_SLOTS.filter((slot) => {
      const slotStart = getDateTimeFrom(reservationDate, slot);
      const slotEnd = new Date(slotStart.getTime() + duration * 60_000);
      const endTime = `${String(slotEnd.getHours()).padStart(2, '0')}:${String(slotEnd.getMinutes()).padStart(2, '0')}`;

      return hasTableOverlap({
        reservations,
        tableIds,
        date: reservationDate,
        startTime: slot,
        endTime,
      });
    });
  }, [duration, reservationDate, reservations, tableIds]);

  const isPastTimeInSelectedDate = useMemo(() => {
    if (reservationDate !== today) return false;
    const nowDate = new Date();
    const selectedStart = getDateTimeFrom(reservationDate, startTime);
    return selectedStart < nowDate;
  }, [reservationDate, startTime, today]);

  useEffect(() => {
    if (!open) return;
    const current = new Date();
    const nextDate = getLocalDateISO(current);
    const nextDefaultTime = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
    setReservationDate(nextDate);
    setStartTime(nextDefaultTime);
    setDuration(table.isVIP ? 120 : 90);
    setClientName('');
    setPartySize(effectiveCapacity);
    setNotes('');
    setError('');
    setSuggestions([]);
  }, [open, table.isVIP, effectiveCapacity]);

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      setError('El nombre del cliente es requerido.');
      return;
    }

    if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
      setError('Ingresa una hora de inicio válida.');
      return;
    }

    if (!Number.isFinite(partySize) || partySize < 1 || partySize > effectiveCapacity) {
      setError(`El número de personas debe estar entre 1 y ${effectiveCapacity}.`);
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
      setError('Selecciona una fecha válida.');
      return;
    }

    if (reservationDate < today) {
      setError('No se pueden crear reservas para días anteriores.');
      return;
    }

    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + duration;
    const endTime = endMinutes >= 24 * 60
      ? '23:59'
      : `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const hasConflict = hasTableOverlap({
      reservations,
      tableIds,
      date: reservationDate,
      startTime,
      endTime,
    });

    if (reservationDate === today) {
      const selectedStart = getDateTimeFrom(reservationDate, startTime);
      if (selectedStart < new Date()) {
        setError('No puedes reservar en una hora pasada.');
        return;
      }
    }

    if (hasConflict) {
      setError('Ya existe una reserva para esa mesa en ese horario. Elige otra hora.');
      return;
    }

    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      await createReservation({
        tableIds,
        clientName: clientName.trim(),
        partySize,
        date: reservationDate,
        startTime,
        endTime,
        status: 'confirmed',
        duration,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      const status = Number(err?.status);
      const rawMessage = typeof err?.message === 'string' ? err.message : '';
      const isConflict =
        status === 409 ||
        /conflict|ocupad|dispon|solap/i.test(rawMessage);

      if (isConflict) {
        setError('La mesa ya no está disponible en ese horario. Elige otro horario o mesa.');
        try {
          const availability = await api.getAvailability(reservationDate, partySize, startTime, table.areaId);
          const options = [...availability.suggestedTables, ...availability.alternatives].slice(0, 4);
          setSuggestions(options);
        } catch {
          setSuggestions([]);
        }
      } else {
        setError(rawMessage || 'Error al crear reserva.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[94vw] sm:max-w-3xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Reservar — {titleName} ({effectiveCapacity}p)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <Input
                type="date"
                min={today}
                value={reservationDate}
                onChange={(e) => setReservationDate(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hora inicio</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => {
                  const nextTime = e.target.value;
                  if (!/^\d{2}:\d{2}$/.test(nextTime)) {
                    setStartTime(nextTime);
                    return;
                  }

                  const selectedStart = getDateTimeFrom(reservationDate, nextTime);
                  if (reservationDate === today && selectedStart < new Date()) {
                    setError('No puedes seleccionar una hora pasada.');
                    return;
                  }

                  if (unavailableSlots.includes(nextTime)) {
                    setError('Ese horario ya está reservado para esta mesa.');
                    return;
                  }

                  setError('');
                  setStartTime(nextTime);
                }}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Duración</Label>
              <div className="flex gap-1">
                {DURATION_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={duration === opt.value ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDuration(opt.value)}
                    className={`text-xs px-3 h-12 ${
                      duration === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.value}m
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Horarios disponibles</Label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {TIME_SLOTS.map((slot) => {
                const slotIsUnavailable = unavailableSlots.includes(slot);
                const slotIsPast = reservationDate === today && getDateTimeFrom(reservationDate, slot) < new Date();
                const disabled = slotIsUnavailable || slotIsPast;

                return (
                  <Button
                    key={slot}
                    type="button"
                    size="sm"
                    variant={startTime === slot ? 'default' : 'ghost'}
                    disabled={disabled}
                    onClick={() => {
                      setError('');
                      setStartTime(slot);
                    }}
                    className="h-8 text-xs"
                  >
                    {slot}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <Label className="text-xs text-muted-foreground">Personas</Label>
              <Input
                type="number"
                min={1}
                max={effectiveCapacity}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="bg-secondary border-border"
              />
            </div>
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

          {suggestions.length > 0 && (
            <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">Opciones disponibles:</p>
              <ul className="space-y-1">
                {suggestions.map((option) => (
                  <li key={`${option.tableName}-${option.tableIds.join('-')}`} className="text-sm text-foreground">
                    {option.tableName} ({option.capacity}p)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || reservationDate < today || isPastTimeInSelectedDate || unavailableSlots.includes(startTime)}
            className="bg-primary text-primary-foreground"
          >
            {loading ? 'Creando...' : 'Confirmar Reserva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
