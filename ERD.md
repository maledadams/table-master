# ERD

## Entidades y relaciones

```mermaid
erDiagram
  restaurant_areas ||--o{ restaurant_tables : contains
  reservations ||--o{ reservation_tables : maps
  restaurant_tables ||--o{ reservation_tables : assigned_to
  reservations ||--o| idempotency_keys : guarded_by

  restaurant_areas {
    text id PK
    text name
    int max_tables
    bool is_vip
  }

  restaurant_tables {
    text id PK
    text area_id FK
    text name
    int capacity
    table_type type
    bool is_vip
    bool can_merge
    text merge_group
    numeric x
    numeric y
    int version
    timestamptz updated_at
  }

  reservations {
    text id PK
    text client_name
    int party_size
    reservation_status status
    timestamptz start_at
    timestamptz end_at
    text notes
  }

  reservation_tables {
    text reservation_id FK
    text table_id FK
  }

  idempotency_keys {
    text key PK
    text request_hash
    text reservation_id FK
    timestamptz created_at
  }
```

## Índices recomendados
- `restaurant_tables(area_id)`
- `reservations(start_at, end_at)`
- `reservations(status)`
- `reservation_tables(table_id)`
- `idempotency_keys(created_at)`

## Reglas clave
- `party_size >= 1`.
- `start_at < end_at`.
- No overlap para mesas compartidas en reservas activas.
- VIP A+B (merge_group `VIP_AB`) máximo 6 personas.
- Máximo 2 unidades funcionales VIP simultáneas.
- Posición `x,y` con clamp por área y tamaño de mesa.
