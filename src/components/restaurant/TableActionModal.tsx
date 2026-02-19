import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TableWithStatus } from '@/types/restaurant';
import { CalendarPlus, UserPlus } from 'lucide-react';

interface TableActionModalProps {
  open: boolean;
  onClose: () => void;
  table: TableWithStatus;
  onReserve: () => void;
  onWalkIn: () => void;
}

export function TableActionModal({ open, onClose, table, onReserve, onWalkIn }: TableActionModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground text-center">
            {table.name} — {table.capacity}p
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 py-4">
          <Button
            onClick={onReserve}
            className="flex-1 h-20 flex-col gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
            variant="ghost"
          >
            <CalendarPlus className="w-6 h-6" />
            <span className="text-sm font-bold">Reserva</span>
          </Button>
          <Button
            onClick={onWalkIn}
            className="flex-1 h-20 flex-col gap-2 bg-secondary hover:bg-accent text-foreground border border-border"
            variant="ghost"
          >
            <UserPlus className="w-6 h-6" />
            <span className="text-sm font-bold">Sin reserva</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
