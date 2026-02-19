# APROACH

## Approach seleccionado
**Approach A — Asignación manual de mesa (validación por intervalos).**

## Por qué se eligió (3 razones)
1. Control operativo directo para host/manager en piso.
2. Implementación rápida y estable para MVP productivo.
3. Permite aplicar reglas de negocio estrictas (solape, VIP, capacidad) con trazabilidad.

## Trade-offs (mínimo 2)
1. Depende más de disciplina operativa humana que un motor automático.
2. No optimiza al máximo ocupación como un algoritmo avanzado de seating.
3. Requiere UI clara para evitar errores de selección manual.

## Qué haríamos distinto en 1 semana
1. Motor de sugerencia automática (mesa/combos) con explainability.
2. Realtime pub/sub para sincronización instantánea entre operadores.
3. Auditoría completa de eventos (quién movió mesa, cuándo y por qué).

## Prioridad del cliente asumida
- Prioridad alta: confiabilidad operativa y evitar conflictos de reserva.
- Prioridad media: velocidad de interacción del floor.
- Prioridad negociada: optimización automática avanzada queda fase 2.
