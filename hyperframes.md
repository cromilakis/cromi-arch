# 🎬 Hyperframes: Video desde HTML

## ¿Qué es?

Framework open-source de HeyGen que convierte **HTML en video MP4**. Escribes HTML con animaciones, y Hyperframes renderiza el video con un comando.

> "Write HTML. Render video. Built for agents."

## Stack

| Componente | Detalle |
|------------|---------|
| **Entrada** | HTML + Tailwind + GSAP (o CSS, Anime.js, Lottie, Three.js) |
| **Motor** | Chromium headless + FFmpeg |
| **Salida** | MP4 |
| **CLI** | `npx hyperframes` |
| **Licencia** | Apache 2.0 |

## Instalación

```bash
npx hyperframes init mi-video
cd mi-video
npx hyperframes preview   # preview en navegador (live reload)
npx hyperframes render    # render a MP4
```

## Para agentes AI

Hyperframes tiene skills/plugins para Claude Code, Cursor, Codex:

```bash
npx skills add heygen-com/hyperframes
```

Esto permite al agente crear videos por prompt:

```
/usando hyperframes, crea un video de 10 segundos
con título fade-in, video de fondo y música
```

## Diferencias con Remotion

| Aspecto | Hyperframes | Remotion |
|---------|-------------|----------|
| **Formato** | HTML nativo | React components |
| **Curva** | Baja (cualquier dev sabe HTML) | Media (React) |
| **Agentes** | Primera clase (skills/plugins) | Manual |
| **Licencia** | Apache 2.0 | Remotion License (paga para uso comercial) |

## Cuándo usarlo

Disponible bajo demanda. Ideal para:

- Videos explicativos de producto
- Demos animados de features
- Contenido para redes sociales
- Presentaciones dinámicas
- Prototipos animados

## Requisitos

- Node.js >= 22
- FFmpeg instalado en el sistema

## Referencias

- GitHub: https://github.com/heygen-com/hyperframes
- Docs: https://hyperframes.heygen.com
- npm: `hyperframes`
