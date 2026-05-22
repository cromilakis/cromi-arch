# Optimización de Imágenes

Estrategia de optimización con `next/image`, Sharp y buenas prácticas de Core Web Vitals.

## Configuración de next/image

En `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
```

## Imágenes Responsivas con Breakpoints

Componente reusable con source sets automáticos:

```tsx
// components/ui/responsive-image.tsx
import Image from 'next/image';

interface Props {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}

const breakpoints = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
};

export function ResponsiveImage({ src, alt, priority, className }: Props) {
  return (
    <div className={`relative w-full ${className ?? ''}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`
          (max-width: ${breakpoints.mobile}px) 100vw,
          (max-width: ${breakpoints.tablet}px) 50vw,
          33vw
        `}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
```

## Formatos de Imagen

| Formato | Cuándo usarlo                 | Soporte navegadores |
|---------|-------------------------------|---------------------|
| WebP    | Default — balance calidad/peso | 96%                 |
| AVIF    | Fallback moderno (mejor compresión) | 92%           |
| PNG     | Transparencia sin pérdida     | 100%                |
| JPEG    | Fotos legacy                  | 100%                |

`next/image` negocia automáticamente WebP/AVIF según el `Accept` header del navegador.

## Lazy Loading Estratégico

```tsx
// Above the fold — priority
<HeroBanner priority />

// Below the fold — lazy por defecto
<ProductCard />   // next/image aplica loading="lazy" automático
```

Reglas:

- Solo imágenes **above the fold** reciben `priority`
- Máximo 1–2 imágenes con `priority` por página
- Las demás usan lazy loading nativo (default de Next.js)

## Optimización de Imágenes Subidas por Usuarios

En Supabase Storage, redimensionamos al subir usando Sharp:

```typescript
// lib/image-optimizer.ts
import sharp from 'sharp';

export async function optimizeUpload(buffer: Buffer): Promise<{
  webp: Buffer;
  avif: Buffer;
  thumbnail: Buffer;
}> {
  const image = sharp(buffer);

  const metadata = await image.metadata();

  // Redimensionar si excede 1920px
  if ((metadata.width ?? 0) > 1920 || (metadata.height ?? 0) > 1920) {
    image.resize(1920, 1920, { fit: 'inside', withoutEnlargement: true });
  }

  const [webp, avif, thumbnail] = await Promise.all([
    image.webp({ quality: 80 }).toBuffer(),
    image.avif({ quality: 70 }).toBuffer(),
    image.resize(150, 150, { fit: 'cover' }).webp({ quality: 60 }).toBuffer(),
  ]);

  return { webp, avif, thumbnail };
}
```

## Impacto en Core Web Vitals

| Métrica  | Cómo la mejoramos                     | Herramienta de medición |
|----------|---------------------------------------|-------------------------|
| **LCP**  | Imágenes con `priority`, formatos modernos, servirlas desde CDN | Lighthouse, Web Vitals |
| **CLS**  | Usar `width` + `height` o `fill` con dimensiones intrínsecas | Lighthouse, Web Vitals |
| **INP**  | Evitar decodificación pesada en interacción | Performance tab |

Verificar con:

```bash
next lint                             # detecta missing width/height en next/image
npx lighthouse http://localhost:3000 --view
```

## Referencias

- [Subida de Archivos](/file-upload.md) — pipeline de subida donde se aplica la optimización Sharp
- [Performance Budget](/performance-budget.md) — LCP ≤ 2.5s y CLS ≤ 0.1 que impactan las imágenes directamente
- [Design System](/design-system.md) — uso de `next/image` como componente base del sistema
