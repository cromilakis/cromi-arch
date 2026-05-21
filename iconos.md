# 🎯 Iconos: Lucide + Iconify + Icônes

## Stack de iconos

| Componente | Rol |
|------------|-----|
| **Lucide React** | Default — iconos consistentes, tree-shakeable, 1500+ iconos |
| **Iconify** | Fuente universal para iconos de 100+ sets (logos, marcas, etc.) |
| **Icônes** | Explorador visual para buscar iconos de cualquier set |

## Lucide (default)

Ya incluido en el stack shadcn/ui. Instalado por defecto con `npx shadcn@latest init`.

```tsx
import { User, Settings, LogOut } from 'lucide-react'

<User className="size-4" />
<Settings className="size-4" />
<LogOut className="size-4" />
```

**Ventajas:** tree-shakeable, solo importas los que usas, consistente con shadcn/ui.

## Iconify (cuando Lucide no tiene el icono)

Para iconos que Lucide no cubre (logos de redes sociales, marcas, flags, etc.):

```bash
npm install @iconify/react
```

```tsx
import { Icon } from '@iconify/react'

<Icon icon="logos:github-icon" className="size-4" />
<Icon icon="simple-icons:tailwindcss" className="size-4" />
<Icon icon="mdi:heart" className="size-4 text-red-500" />
```

**Ventajas:** 100+ sets (Material Design, FontAwesome, Simple Icons, Logos, etc.), SSR compatible.

## Icônes — el explorador

**https://icones.js.org** es un buscador visual de iconos. Permite:

- Buscar por nombre con fuzzy search
- Filtrar por set (Lucide, Material, Logos, etc.)
- Copiar el código de uso directo
- Descargar SVG
- Modo oscuro
- Marcar favoritos

## Regla de uso

```
1. Buscar en Lucide primero (consistencia visual)
2. Si no existe, buscar en Icônes (icones.js.org)
3. Usar Iconify @iconify/react para renderizar
```

## Referencias

- Icônes: https://icones.js.org
- Lucide: https://lucide.dev
- Iconify: https://iconify.design
- GitHub Icônes: https://github.com/antfu-collective/icones
- [Design System](/design-system.md) — Lucide incluido por defecto con shadcn/ui
- [Estándares de Diseño](/estandares-diseno.md) — iconos se usan dentro de componentes shadcn/ui (Zero Raw HTML)
