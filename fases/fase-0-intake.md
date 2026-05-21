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

## Actividades

1. Leer el issue o recibir la solicitud por chat
2. Procesar imágenes adjuntas si las hay (protocolo anterior)
3. Desambiguar con el humano:
   - Alcance exacto de lo que se pide
   - Prioridad (alta / media / baja)
   - Criterios de éxito (¿cómo sabemos que está listo?)
   - Dependencias o restricciones conocidas
4. Proponer alcance inicial documentado

## Artefactos

| Archivo | Descripción |
|---|---|
| `.specify/scope-initial.md` | Alcance documentado con criterios de éxito |

## Gate Humano

> "Este es el alcance propuesto. ¿Lo apruebas o ajustamos algo?"

✅ El humano aprueba el alcance antes de pasar a Fase 1.
