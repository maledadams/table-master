import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TableWithStatus } from '@/types/restaurant';
import { CalendarPlus, UserPlus, Combine } from 'lucide-react';

interface TableActionModalProps {
  open: boolean;
  onClose: () => void;
  table: TableWithStatus;
  onReserve: () => void;
  onWalkIn: () => void;
  canCombine?: boolean;
  onCombine?: () => void;
}

export function TableActionModal({ open, onClose, table, onReserve, onWalkIn, canCombine, onCombine }: TableActionModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground text-center">
            {table.name} — {table.capacity}p
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          <div className="flex gap-3">
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

          {canCombine && onCombine && (
            <Button
              onClick={onCombine}
              className="h-14 flex-col gap-1 bg-[hsl(42_75%_55%/0.15)] hover:bg-[hsl(42_75%_55%/0.25)] text-[hsl(42_75%_55%)] border border-[hsl(42_75%_55%/0.3)]"
              variant="ghost"
            >
              <Combine className="w-5 h-5" />
              <span className="text-sm font-bold">Combinar A + B (6p)</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
