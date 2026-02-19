export type AreaName = 'Terraza' | 'Patio' | 'Lobby' | 'Bar' | 'VIP';

export interface Area {
  id: string;
  name: AreaName;
  maxTables: number;
}

export type TableType = 'standard' | 'circular' | 'square';

export interface RestaurantTable {
  id: string;
  areaId: string;
  capacity: number;
  type: TableType;
  name: string;
  isVIP: boolean;
  canMerge: boolean;
  mergeGroup: string | null;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Reservation {
  id: string;
  tableIds: string[];
  clientName: string;
  partySize: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: ReservationStatus;
  duration: number; // minutes
  notes: string;
}

export type TableVisualStatus = 'available' | 'occupied' | 'reserved_future' | 'reserved_active' | 'vip_combined';

export interface TableWithStatus extends RestaurantTable {
  visualStatus: TableVisualStatus;
  reservation?: Reservation;
}

export interface AvailabilitySuggestion {
  tableIds: string[];
  capacity: number;
  tableName: string;
}

export interface AvailabilityResponse {
  suggestedTables: AvailabilitySuggestion[];
  alternatives: AvailabilitySuggestion[];
}
