# Fase 0: Intake y Clarificación

**Propósito:** Recibir la solicitud — vía chat o GitHub Issue — desambiguar alcance, prioridad y criterios de éxito, y proponer un alcance inicial documentado.

## Fuentes de entrada

### Opción A — GitHub Issue (preferida)

```bash
gh issue view <número> --json title,body,labels,comments
```

El agente lee título, descripción, labels y comentarios del issue. Si el issue referencia imágenes adjuntas, se aplica el **protocolo de imágenes** descrito abajo.

### Opción B — Chat directo

El humano describe la solicitud en el chat. El agente desambigua mediante preguntas.

---

## Protocolo de imágenes desde Issues

Las imágenes adjuntas en GitHub Issues son URLs de CDN — no están en el repo. El agente las descarga, lee y elimina. **Nunca deben quedar en el repositorio.**

### Pasos

```bash
# 1. Extraer URLs de imágenes del cuerpo del issue
gh issue view <número> --json body --jq '.body' | grep -oP 'https://[^\s"]+\.(png|jpg|jpeg|gif|webp)'

# 2. Descargar a directorio temporal FUERA del repo
mkdir -p /tmp/issue-<número>
curl -L "<url-imagen>" -o /tmp/issue-<número>/img-1.png

# 3. Leer la imagen (Claude la procesa visualmente)
# Read /tmp/cromi-issue-<número>/img-1.png

# 4. Eliminar inmediatamente después de leer
rm -rf /tmp/issue-<número>
```

### Reglas

- El directorio temporal siempre es `/tmp/issue-<número>/` — fuera del repo, nunca dentro de él
- La eliminación ocurre en el mismo turno en que se leyó la imagen, no al final de la sesión
- Si hay múltiples imágenes, se descargan todas, se leen todas, se elimina el directorio completo de una vez
- Si la descarga falla (URL expirada, privada), el agente lo reporta y pide al humano que adjunte la imagen en el repo bajo `specs/NNN/assets/`

---

## Protocolo de clarificaciones

Cuando el agente necesita desambiguar, **no hace preguntas abiertas en texto libre**. Presenta opciones concretas basadas en su análisis del issue, siempre con una opción "Other" para que el humano pueda indicar su propio criterio.

### Reglas del protocolo

1. **Máximo 4 preguntas por turno** — agrupar lo que se puede inferir, preguntar solo lo ambiguo
2. **Siempre proponer opciones** — el agente analiza el issue y genera las opciones más probables
3. **Siempre incluir "Other"** — el humano puede salirse de las opciones propuestas
4. **Una pregunta por dimensión** — alcance, prioridad, criterio de éxito, dependencias

### Ejemplo de clarificación bien formada

Dado un issue: *"el login no funciona bien en móvil"*

El agente no pregunta: *"¿Qué quieres que haga?"*

El agente presenta:

```
Pregunta 1 — Alcance
  ¿Qué parte del flujo de login está afectada?
  a) Solo el formulario visual (layout roto en pantalla chica)
  b) El submit no responde en dispositivos touch
  c) La redirección post-login falla en mobile browsers
  d) Other

Pregunta 2 — Prioridad
  ¿Qué urgencia tiene este fix?
  a) Alta — está bloqueando usuarios en producción
  b) Media — afecta a algunos usuarios pero hay workaround
  c) Baja — es una mejora de experiencia
  d) Other

Pregunta 3 — Criterio de éxito
  ¿Cómo verificamos que está resuelto?
  a) Login funciona en Chrome/Safari mobile sin errores visuales
  b) Tests E2E pasan en viewport mobile (375px)
  c) QA manual en dispositivo físico iOS + Android
  d) Other
```

### Cuándo NO preguntar

Si el agente puede inferir la respuesta con alta confianza desde el issue, el historial del repo, o el contexto de la conversación, **no pregunta** — asume y documenta el supuesto en `scope-initial.md` para que el humano lo pueda corregir en el gate.

---

## Actividades

1. Leer el issue o recibir la solicitud por chat
2. Procesar imágenes adjuntas si las hay (protocolo de imágenes)
3. Analizar el issue e identificar qué dimensiones son ambiguas
4. Presentar clarificaciones con opciones (máximo 4 preguntas, formato con opciones + Other)
5. Proponer alcance inicial documentado basado en las respuestas

## Artefactos

| Archivo | Descripción |
|---|---|
| `.specify/scope-initial.md` | Alcance documentado con criterios de éxito y supuestos asumidos |

## Gate Humano

> "Este es el alcance propuesto. ¿Lo apruebas o ajustamos algo?"

✅ El humano aprueba el alcance antes de pasar a Fase 1.
