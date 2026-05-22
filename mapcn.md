# 🗺️ mapcn: Mapas para React

## ¿Qué es?

Librería de componentes de mapa para React construida sobre **MapLibre GL**, estilizada con **Tailwind CSS** y compatible con **shadcn/ui**.

## Stack compatible

| Componente | Tecnología |
|------------|------------|
| **Motor** | MapLibre GL (open source) |
| **Estilos** | Tailwind CSS |
| **UI** | shadcn/ui |
| **Tema** | Claro/oscuro automático |
| **Licencia** | MIT |

## Componentes

- Mapa base con zoom/pan
- Marcadores con popups y tooltips
- Rutas y trazados
- Controles: zoom, brújula, localización, pantalla completa
- Composable: construye UIs de mapa complejas con componentes simples

## Instalación

```bash
npm install mapcn
# o desde GitHub hasta que se publique el nombre correcto en npm
npm install AnmolSaini16/mapcn
```

## Uso básico

```tsx
import { Map, Marker, Popup } from 'mapcn'

export default function MapaPage() {
  return (
    <Map
      center={[-99.1332, 19.4326]} // [lng, lat]
      zoom={12}
      className="h-[500px] w-full rounded-lg"
    >
      <Marker longitude={-99.1332} latitude={19.4326}>
        <Popup>
          <p className="text-sm">Ciudad de México</p>
        </Popup>
      </Marker>
    </Map>
  )
}
```

## Tiles

Por defecto usa CARTO Basemaps. Para uso comercial sin licencia CARTO, cambiar a:

```tsx
<Map
  mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  // O alternativas gratuitas:
  // mapStyle="https://tiles.openfreemap.org/styles/liberty"
  // mapStyle="https://demotiles.maplibre.org/style.json"
>
```

| Proveedor | Gratis | Comercial |
|-----------|--------|-----------|
| CARTO Basemaps | Solo entidades sin fines de lucro | Requiere licencia |
| OpenStreetMap | ✅ | ✅ |
| MapTiler | ✅ Free tier | ✅ Planes pagos |
| Stadia Maps | ✅ Free tier | ✅ Planes pagos |
| OpenFreeMap | ✅ | ✅ |

## Cuándo usarlo

Disponible bajo demanda cuando el proyecto lo requiera. No es parte del stack base.

- Ubicaciones en mapas
- Dashboards con datos geoespaciales
- Rutas y navegación
- Selección de ubicación en formularios

## Referencias

- GitHub: https://github.com/AnmolSaini16/mapcn
- Docs: https://mapcn.dev/docs
- MapLibre GL: https://maplibre.org
