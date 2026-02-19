import { memo } from 'react';
import { TableWithStatus } from '@/types/restaurant';
import { CountdownTimer } from './CountdownTimer';
import { cn } from '@/lib/utils';
import { getTableDimensions } from './table-dimensions';

interface TableComponentProps {
  table: TableWithStatus;
  onClick: (table: TableWithStatus) => void;
  isMergedView?: boolean;
}

function getStatusClass(status: TableWithStatus['visualStatus']): string {
  switch (status) {
    case 'available': return 'table-available hover:brightness-125';
    case 'occupied': return 'table-occupied';
    case 'reserved_future': return 'table-reserved-future';
    case 'reserved_active': return 'table-reserved-active';
    case 'vip_combined': return 'table-reserved-active table-vip-border';
  }
}

export const TableComponent = memo(function TableComponent({ table, onClick, isMergedView }: TableComponentProps) {
  const dims = getTableDimensions(table, isMergedView);
  const statusClass = getStatusClass(table.visualStatus);
  const showTimer = (table.visualStatus === 'reserved_active' || table.visualStatus === 'vip_combined') &&
    table.reservation && table.reservation.duration > 0;

  return (
    <button
      onClick={() => onClick(table)}
      className={cn(
        dims.sizeClass,
        dims.roundedClass,
        statusClass,
        'flex flex-col items-center justify-center gap-1 p-2 cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 select-none border border-white/10',
        table.isVIP && table.visualStatus !== 'vip_combined' && 'table-vip-border'
      )}
      title={`${table.name} (${table.capacity}p) - ${table.visualStatus}`}
    >
      <span className="text-[1.375rem] font-bold leading-none opacity-95">{table.name}</span>
      <span className="text-[1.25rem] leading-none opacity-70">{isMergedView ? 'A+B 6p' : `${table.capacity}p`}</span>

      {showTimer && table.reservation && (
        <CountdownTimer
          startTime={table.reservation.startTime}
          duration={table.reservation.duration}
          date={table.reservation.date}
        />
      )}

      {table.visualStatus === 'reserved_future' && table.reservation && (
        <span className="text-[1rem] leading-none opacity-70 mt-1">
          {table.reservation.startTime}
        </span>
      )}

      {table.visualStatus === 'occupied' && (
        <span className="text-[1rem] leading-none opacity-60 mt-1">Ocupada</span>
      )}
    </button>
  );
});
