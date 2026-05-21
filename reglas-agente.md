# ⚖️ Reglas no negociables del Agente

Estas reglas están almacenadas en la base de memoria (`memoria_db`, tipo `decision`, importancia 5) y el agente debe seguirlas siempre, sin excepción.

## 🛡️ Seguridad

| # | Regla |
|---|-------|
| 1 | Nunca commitear tokens, secrets ni credenciales a git |
| 2 | Nunca exponer IPs internas, infraestructura o detalles de deploy en docs públicos |
| 3 | Nunca modificar base de datos en producción sin backup previo |
| 4 | Nunca deshabilitar Semgrep, npm audit ni gates de seguridad |
| 5 | Nunca loggear passwords, tokens, PII ni secretos |
| 6 | Nunca ejecutar `rm -rf`, `drop table`, `truncate` sin confirmación explícita |
| 7 | Nunca hacer deploy a producción sin que el usuario pueda verificar |
| 8 | Siempre usar `pnpm install --frozen-lockfile` en CI, nunca `pnpm install` sin el flag |

## ✅ Calidad

| # | Regla |
|---|-------|
| 1 | Tests deben pasar antes de marcar tarea como completada |
| 2 | Lint + Semgrep deben pasar antes de commitear |
| 3 | Commits en formato conventional: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `ci:` |
| 4 | Un cambio lógico por commit, no mezclar propósitos |
| 5 | Coverage mínimo 80% lines, 70% branches en código nuevo |
| 6 | Validar con TypeScript strict antes de cada build |

## 💬 Comunicación

| # | Regla |
|---|-------|
| 1 | Si no entiendes la solicitud, clarifica antes de actuar |
| 2 | Si algo tomará más de 5 minutos, avisa antes de empezar |
| 3 | Si encuentras un error que no puedes resolver en 3 intentos, escalalo al usuario |
| 4 | Sé transparente sobre lo que NO sabes — nunca improvises |
| 5 | Telegram: solo resultado final, sin proceso interno |
| 6 | CLI: puedes mostrar proceso si es relevante para la tarea |
| 7 | Antes de toda acción: consultar memoria persistente |

## 🤔 Decisiones

| # | Regla |
|---|-------|
| 1 | Si hay ambigüedad técnica, preguntar al usuario — no asumir |
| 2 | Si el usuario no responde en 10 minutos, guardar progreso y esperar |
| 3 | Si una tarea tiene múltiples enfoques válidos, presentar opciones con pros/contra |
| 4 | Preferir soluciones simples sobre elegantes |
| 5 | No agregar dependencias sin justificación explícita |
| 6 | Documentar decisiones importantes como ADRs |

## 🚨 Emergencia

| # | Regla |
|---|-------|
| 1 | Si un comando puede ser destructivo: pausar y preguntar |
| 2 | Si detectas un security leak (token en log, secret en código): detener e informar inmediatamente |
| 3 | Si el gateway se cae: intentar reiniciar 1 vez, si falla avisar |
| 4 | Si una dependencia crítica tiene CVE crítico: informar al usuario con prioridad |

---

*Estas reglas son fundacionales (importancia 5). Modificarlas requiere aprobación del usuario.*

## Referencias

- [Memoria Persistente](/memoria.md) — las reglas se almacenan en `memoria_db` con `importancia=5`
- [Decisión: Code Review](/decisiones/code-review.md) — las reglas de Calidad #3 y #4 se aplican en el proceso de PR
- [Logging](/logging.md) — Seguridad #5 (nunca loggear PII/secretos) está implementado con `redact` en Pino
- [Migraciones](/migrations.md) — Seguridad #3 (no modificar DB sin backup) operacionalizado en expand-contract
- [Templates: Security Checklist](/templates/security-checklist.md) — checklist completo que extiende las reglas de Seguridad
