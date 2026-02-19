import { Area, RestaurantTable, Reservation } from '@/types/restaurant';

export const mockAreas: Area[] = [
  { id: 'area-terraza', name: 'Terraza', maxTables: 8 },
  { id: 'area-patio', name: 'Patio', maxTables: 8 },
  { id: 'area-lobby', name: 'Lobby', maxTables: 8 },
  { id: 'area-bar', name: 'Bar', maxTables: 8 },
  { id: 'area-vip', name: 'Salones VIP', maxTables: 3 },
];

export const mockTables: RestaurantTable[] = [
  // Terraza (8 mesas): 2×2p, 3×4p, 2×6p, 1×8p
  { id: 't-t1', areaId: 'area-terraza', capacity: 2, type: 'standard', name: 'T1', isVIP: false, canMerge: false, mergeGroup: null, x: 8, y: 12 },
  { id: 't-t2', areaId: 'area-terraza', capacity: 2, type: 'standard', name: 'T2', isVIP: false, canMerge: false, mergeGroup: null, x: 28, y: 12 },
  { id: 't-t3', areaId: 'area-terraza', capacity: 4, type: 'standard', name: 'T3', isVIP: false, canMerge: false, mergeGroup: null, x: 50, y: 12 },
  { id: 't-t4', areaId: 'area-terraza', capacity: 4, type: 'standard', name: 'T4', isVIP: false, canMerge: false, mergeGroup: null, x: 75, y: 12 },
  { id: 't-t5', areaId: 'area-terraza', capacity: 4, type: 'standard', name: 'T5', isVIP: false, canMerge: false, mergeGroup: null, x: 8, y: 48 },
  { id: 't-t6', areaId: 'area-terraza', capacity: 6, type: 'standard', name: 'T6', isVIP: false, canMerge: false, mergeGroup: null, x: 32, y: 48 },
  { id: 't-t7', areaId: 'area-terraza', capacity: 6, type: 'standard', name: 'T7', isVIP: false, canMerge: false, mergeGroup: null, x: 60, y: 48 },
  { id: 't-t8', areaId: 'area-terraza', capacity: 8, type: 'standard', name: 'T8', isVIP: false, canMerge: false, mergeGroup: null, x: 40, y: 80 },

  // Patio (7 mesas): 2×2p, 2×4p, 2×6p, 1×8p
  { id: 't-p1', areaId: 'area-patio', capacity: 2, type: 'standard', name: 'P1', isVIP: false, canMerge: false, mergeGroup: null, x: 10, y: 15 },
  { id: 't-p2', areaId: 'area-patio', capacity: 2, type: 'standard', name: 'P2', isVIP: false, canMerge: false, mergeGroup: null, x: 35, y: 15 },
  { id: 't-p3', areaId: 'area-patio', capacity: 4, type: 'standard', name: 'P3', isVIP: false, canMerge: false, mergeGroup: null, x: 60, y: 15 },
  { id: 't-p4', areaId: 'area-patio', capacity: 4, type: 'standard', name: 'P4', isVIP: false, canMerge: false, mergeGroup: null, x: 82, y: 15 },
  { id: 't-p5', areaId: 'area-patio', capacity: 6, type: 'standard', name: 'P5', isVIP: false, canMerge: false, mergeGroup: null, x: 18, y: 55 },
  { id: 't-p6', areaId: 'area-patio', capacity: 6, type: 'standard', name: 'P6', isVIP: false, canMerge: false, mergeGroup: null, x: 52, y: 55 },
  { id: 't-p7', areaId: 'area-patio', capacity: 8, type: 'standard', name: 'P7', isVIP: false, canMerge: false, mergeGroup: null, x: 40, y: 82 },

  // Lobby (6 mesas): 2×2p, 2×4p, 2×6p
  { id: 't-l1', areaId: 'area-lobby', capacity: 2, type: 'standard', name: 'L1', isVIP: false, canMerge: false, mergeGroup: null, x: 12, y: 18 },
  { id: 't-l2', areaId: 'area-lobby', capacity: 2, type: 'standard', name: 'L2', isVIP: false, canMerge: false, mergeGroup: null, x: 45, y: 18 },
  { id: 't-l3', areaId: 'area-lobby', capacity: 4, type: 'standard', name: 'L3', isVIP: false, canMerge: false, mergeGroup: null, x: 78, y: 18 },
  { id: 't-l4', areaId: 'area-lobby', capacity: 4, type: 'standard', name: 'L4', isVIP: false, canMerge: false, mergeGroup: null, x: 12, y: 58 },
  { id: 't-l5', areaId: 'area-lobby', capacity: 6, type: 'standard', name: 'L5', isVIP: false, canMerge: false, mergeGroup: null, x: 45, y: 58 },
  { id: 't-l6', areaId: 'area-lobby', capacity: 6, type: 'standard', name: 'L6', isVIP: false, canMerge: false, mergeGroup: null, x: 78, y: 58 },

  // Bar (5 mesas): 2×2p, 3×4p
  { id: 't-b1', areaId: 'area-bar', capacity: 2, type: 'standard', name: 'B1', isVIP: false, canMerge: false, mergeGroup: null, x: 10, y: 25 },
  { id: 't-b2', areaId: 'area-bar', capacity: 2, type: 'standard', name: 'B2', isVIP: false, canMerge: false, mergeGroup: null, x: 35, y: 25 },
  { id: 't-b3', areaId: 'area-bar', capacity: 4, type: 'standard', name: 'B3', isVIP: false, canMerge: false, mergeGroup: null, x: 60, y: 25 },
  { id: 't-b4', areaId: 'area-bar', capacity: 4, type: 'standard', name: 'B4', isVIP: false, canMerge: false, mergeGroup: null, x: 22, y: 65 },
  { id: 't-b5', areaId: 'area-bar', capacity: 4, type: 'standard', name: 'B5', isVIP: false, canMerge: false, mergeGroup: null, x: 55, y: 65 },

  // VIP (3 mesas): 1×10p redonda, Cuadrada A 4p, Cuadrada B 4p
  { id: 't-v1', areaId: 'area-vip', capacity: 10, type: 'circular', name: 'Redonda VIP', isVIP: true, canMerge: false, mergeGroup: null, x: 40, y: 15 },
  { id: 't-va', areaId: 'area-vip', capacity: 4, type: 'square', name: 'Cuadrada A', isVIP: true, canMerge: true, mergeGroup: 'VIP_AB', x: 22, y: 62 },
  { id: 't-vb', areaId: 'area-vip', capacity: 4, type: 'square', name: 'Cuadrada B', isVIP: true, canMerge: true, mergeGroup: 'VIP_AB', x: 58, y: 62 },
];

// Some sample reservations for today
const today = new Date().toISOString().split('T')[0];

export const mockReservations: Reservation[] = [
  {
    id: 'res-1',
    tableIds: ['t-t3'],
    clientName: 'García López',
    partySize: 3,
    date: today,
    startTime: '13:00',
    endTime: '14:30',
    status: 'confirmed',
    duration: 90,
    notes: 'Cumpleaños',
  },
  {
    id: 'res-2',
    tableIds: ['t-t6'],
    clientName: 'Martínez Ruiz',
    partySize: 5,
    date: today,
    startTime: '14:00',
    endTime: '15:30',
    status: 'confirmed',
    duration: 90,
    notes: '',
  },
  {
    id: 'res-3',
    tableIds: ['t-va', 't-vb'],
    clientName: 'Fernández VIP',
    partySize: 5,
    date: today,
    startTime: '20:00',
    endTime: '22:00',
    status: 'confirmed',
    duration: 120,
    notes: 'Cliente frecuente',
  },
  {
    id: 'res-4',
    tableIds: ['t-p3'],
    clientName: 'Walk-in',
    partySize: 2,
    date: today,
    startTime: '12:30',
    endTime: '23:59',
    status: 'confirmed',
    duration: 0,
    notes: 'Sin reserva',
  },
];
