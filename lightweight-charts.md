# 📊 TradingView Lightweight Charts

## ¿Qué es?

Librería de gráficos financieros performante, liviana y open-source. Renderiza con HTML5 Canvas. Ideal para dashboards financieros, de trading, o cualquier visualización de series de tiempo.

## Stack

| Aspecto | Detalle |
|---------|---------|
| **Motor** | HTML5 Canvas |
| **Bundle** | ~45KB gzip |
| **Performance** | 60 FPS con miles de datos |
| **Licencia** | Apache 2.0 |
| **npm** | `lightweight-charts` v5.2.0 |
| **Repo** | tradingview/lightweight-charts |

## Instalación

```bash
npm install lightweight-charts
```

## Uso básico

```tsx
import { createChart } from 'lightweight-charts'
import { useEffect, useRef } from 'react'

export function ChartComponent({ data }: { data: any[] }) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
    })

    const lineSeries = chart.addLineSeries({ color: '#2962FF' })
    lineSeries.setData(data)

    const handleResize = () => {
      chart.applyOptions({ width: chartRef.current!.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data])

  return <div ref={chartRef} className="w-full rounded-lg" />
}
```

## Tipos de gráficos

| Tipo | Serie | Uso |
|------|-------|-----|
| Línea | `addLineSeries()` | Tendencias, series de tiempo |
| Candlestick | `addCandlestickSeries()` | Velas OHLC (financial) |
| Bar | `addBarSeries()` | Barras OHLC |
| Área | `addAreaSeries()` | Volumen, áreas rellenas |
| Histograma | `addHistogramSeries()` | Distribuciones, volumen |
| Baselines | `addBaselineSeries()` | Comparación contra referencia |

## Theme-aware

```tsx
const isDark = document.documentElement.classList.contains('dark')

createChart(container, {
  layout: {
    background: { color: isDark ? '#1a1a2e' : '#ffffff' },
    textColor: isDark ? '#d1d5db' : '#333333',
  },
  grid: {
    vertLines: { color: isDark ? '#2d2d44' : '#f0f0f0' },
    horzLines: { color: isDark ? '#2d2d44' : '#f0f0f0' },
  },
})
```

## Cuándo usarlo

Disponible bajo demanda. Ideal para:

- Dashboards financieros
- Visualización de series de tiempo
- KPIs historicos con tendencias
- Trading / inversiones
- Métricas de negocio en el tiempo

## Referencias

- GitHub: https://github.com/tradingview/lightweight-charts
- npm: `lightweight-charts`
- Docs: https://tradingview.github.io/lightweight-charts/
- [Analítica](/analytics.md) — combinar con métricas de negocio para dashboards de KPIs
- [Design System](/design-system.md) — usar CSS variables del tema para colores del gráfico
