# EDGE_CASE

1. **Reserva de 7 personas**  
   Si piden 7, sugerimos mesa de 8; si no hay, devolvemos alternativas o sin disponibilidad (`200` con listas vacías).

2. **Reserva en el pasado**  
   Si `date/startTime` ya pasó y no es walk-in, rechazamos con `422`.

3. **startTime >= endTime**  
   Si el intervalo es inválido, rechazamos con `422`.

4. **Solape de mesa activa**  
   Si una mesa ya está en reserva activa en ese rango, rechazamos con `409`.

5. **Idempotency-Key repetida con payload distinto**  
   Si llega la misma key con body diferente, rechazamos con `409` (`IDEMPOTENCY_CONFLICT`).

6. **Concurrencia en mover mesa**  
   Si `expectedVersion` no coincide, rechazamos con `409` (`CONCURRENCY_CONFLICT`) y forzamos refresh.

7. **Crear mesa en VIP**  
   Si intentan crear mesa en `Salones VIP`, rechazamos con `422`.

8. **Crear mesa en área llena (>=8 no VIP)**  
   Si el área ya tiene 8 mesas, rechazamos con `409`.

9. **VIP A+B con partySize > 6**  
   Si reservan ambas mesas VIP_AB para más de 6 personas, rechazamos con `422`.

10. **Más de 2 unidades funcionales VIP simultáneas**  
    Si el nuevo bloque horario supera 2 unidades VIP activas, rechazamos con `409`.
