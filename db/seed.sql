begin;

delete from reservation_tables;
delete from idempotency_keys;
delete from reservations;
delete from restaurant_tables;
delete from restaurant_areas;

insert into restaurant_areas (id, name, max_tables, is_vip) values
  ('area-terraza', 'Terraza', 8, false),
  ('area-patio', 'Patio', 8, false),
  ('area-lobby', 'Lobby', 8, false),
  ('area-bar', 'Bar', 8, false),
  ('area-vip', 'Salones VIP', 3, true);

insert into restaurant_tables (
  id, area_id, name, capacity, type, is_vip, can_merge, merge_group, x, y
) values
  ('t-t1', 'area-terraza', 'T1', 2, 'standard', false, false, null, 8, 12),
  ('t-t2', 'area-terraza', 'T2', 2, 'standard', false, false, null, 28, 12),
  ('t-p1', 'area-patio', 'P1', 2, 'standard', false, false, null, 10, 15),
  ('t-p3', 'area-patio', 'P3', 4, 'standard', false, false, null, 60, 15),
  ('t-l3', 'area-lobby', 'L3', 4, 'standard', false, false, null, 78, 18),
  ('t-b3', 'area-bar', 'B3', 4, 'standard', false, false, null, 60, 25),
  ('t-v1', 'area-vip', 'Redonda VIP', 10, 'circular', true, false, null, 40, 15),
  ('t-va', 'area-vip', 'Cuadrada A', 4, 'square', true, true, 'VIP_AB', 22, 62),
  ('t-vb', 'area-vip', 'Cuadrada B', 4, 'square', true, true, 'VIP_AB', 58, 62);

insert into reservations (
  id, client_name, party_size, status, start_at, end_at, notes
) values
  ('res-1', 'Garcia Lopez', 3, 'confirmed', '2026-02-19T13:00:00Z', '2026-02-19T14:30:00Z', 'Cumpleanos'),
  ('res-3', 'Fernandez VIP', 5, 'confirmed', '2026-02-19T20:00:00Z', '2026-02-19T22:00:00Z', 'Cliente frecuente');

insert into reservation_tables (reservation_id, table_id) values
  ('res-1', 't-l3'),
  ('res-3', 't-va'),
  ('res-3', 't-vb');

commit;
