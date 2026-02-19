import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRestaurantStore } from '@/store/restaurant-store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X, UserX } from 'lucide-react';

interface ReservationListPanelProps {
  open: boolean;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-primary/20 text-primary border-primary/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  no_show: 'bg-muted text-muted-foreground border-border',
};

export function ReservationListPanel({ open, onClose }: ReservationListPanelProps) {
  const { reservations, tables, updateReservationStatus } = useRestaurantStore();

  const todayReservations = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return reservations
      .filter((r) => r.date === today && r.duration > 0) // exclude walk-ins
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [reservations]);

  const getTableNames = (tableIds: string[]) =>
    tableIds.map((id) => tables.find((t) => t.id === id)?.name ?? id).join(' + ');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-card max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Reservas del Día</DialogTitle>
        </DialogHeader>

        {todayReservations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No hay reservas para hoy.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground text-xs">Hora</TableHead>
                <TableHead className="text-muted-foreground text-xs">Mesa</TableHead>
                <TableHead className="text-muted-foreground text-xs">Cliente</TableHead>
                <TableHead className="text-muted-foreground text-xs">Pers.</TableHead>
                <TableHead className="text-muted-foreground text-xs">Estado</TableHead>
                <TableHead className="text-muted-foreground text-xs">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayReservations.map((res) => (
                <TableRow key={res.id} className="border-border">
                  <TableCell className="text-sm font-mono">
                    {res.startTime} - {res.endTime}
                  </TableCell>
                  <TableCell className="text-sm font-semibold">{getTableNames(res.tableIds)}</TableCell>
                  <TableCell className="text-sm">{res.clientName}</TableCell>
                  <TableCell className="text-sm">{res.partySize}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[res.status] || ''}>
                      {res.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(res.status === 'pending' || res.status === 'confirmed') && (
                      <div className="flex gap-1">
                        {res.status === 'pending' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-400 hover:bg-green-400/10"
                            onClick={() => updateReservationStatus(res.id, 'confirmed')}
                            title="Confirmar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => updateReservationStatus(res.id, 'cancelled')}
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                          onClick={() => updateReservationStatus(res.id, 'no_show')}
                          title="No show"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
