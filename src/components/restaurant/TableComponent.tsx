import React, { memo } from 'react';
import { TableWithStatus } from '@/types/restaurant';
import { CountdownTimer } from './CountdownTimer';
import { cn } from '@/lib/utils';

interface TableComponentProps {
  table: TableWithStatus;
  onClick: (table: TableWithStatus) => void;
  isMergedView?: boolean;
}

function getTableDimensions(table: TableWithStatus, isMergedView?: boolean): { width: string; height: string; rounded: string } {
  if (table.type === 'circular') {
    return { width: 'w-24 h-24', height: '', rounded: 'rounded-full' };
  }

  if (isMergedView) {
    return { width: 'w-36 h-16', height: '', rounded: 'rounded-lg' };
  }

  switch (table.capacity) {
    case 2: return { width: 'w-14 h-14', height: '', rounded: 'rounded-md' };
    case 4: return { width: 'w-20 h-14', height: '', rounded: 'rounded-md' };
    case 6: return { width: 'w-24 h-16', height: '', rounded: 'rounded-lg' };
    case 8: return { width: 'w-28 h-16', height: '', rounded: 'rounded-lg' };
    case 10: return { width: 'w-24 h-24', height: '', rounded: 'rounded-full' };
    default: return { width: 'w-16 h-14', height: '', rounded: 'rounded-md' };
  }
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
        dims.width,
        dims.rounded,
        statusClass,
        'flex flex-col items-center justify-center gap-0.5 p-1 cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 select-none border border-white/5',
        table.isVIP && table.visualStatus !== 'vip_combined' && 'table-vip-border'
      )}
      title={`${table.name} (${table.capacity}p) - ${table.visualStatus}`}
    >
      <span className="text-[10px] font-bold leading-none opacity-90">{table.name}</span>
      <span className="text-[9px] leading-none opacity-60">{isMergedView ? 'A+B 8p' : `${table.capacity}p`}</span>

      {showTimer && table.reservation && (
        <CountdownTimer
          startTime={table.reservation.startTime}
          duration={table.reservation.duration}
          date={table.reservation.date}
        />
      )}

      {table.visualStatus === 'reserved_future' && table.reservation && (
        <span className="text-[8px] leading-none opacity-70 mt-0.5">
          {table.reservation.startTime}
        </span>
      )}

      {table.visualStatus === 'occupied' && (
        <span className="text-[8px] leading-none opacity-60 mt-0.5">Ocupada</span>
      )}
    </button>
  );
});
