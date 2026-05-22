# 📄 pdfx-cli — Componentes React para generación de PDF

`pdfx-cli` es una librería de componentes React para generar documentos PDF, inspirada en shadcn/ui. Utiliza `@react-pdf/renderer` por debajo y proporciona **24 componentes** y **10 bloques predefinidos** (facturas, reportes) que se pueden añadir a proyectos React/Next.js mediante CLI.

> **Propósito:** Tener esta herramienta documentada y lista para usar cuando en el ciclo de vida de desarrollo de un proyecto surja la necesidad de generar comprobantes, reportes, facturas o cualquier documento PDF.

---

## Instalación

### 1. Requisitos

- Proyecto React o Next.js con `package.json`
- Node.js >= 18

### 2. Inicializar pdfx-cli

```bash
npx pdfx-cli@latest init
```

Esto instala `@react-pdf/renderer` y pregunta dónde colocar los componentes (por defecto `./src/components/pdfx`).

### 3. Añadir componentes

```bash
# Añadir componentes individuales
npx pdfx-cli@latest add heading table text

# Añadir un bloque completo (factura, reporte)
npx pdfx-cli@latest block add invoice-classic
```

---

## Componentes disponibles (24)

### Texto y tipografía

| Componente | Descripción |
|-----------|-------------|
| `heading` | 6 niveles (h1–h6) para títulos |
| `text` | Párrafos de texto |
| `list` | Listas: bullet, numerada, checklist, con iconos, multi-nivel, descriptiva |
| `link` | Hipervínculos |
| `divider` | Línea horizontal con espaciado adaptado al tema |

### Layout y estructura

| Componente | Descripción |
|-----------|-------------|
| `section` | Sección lógica con espaciado temático |
| `stack` | Layout vertical con gap temático |
| `card` | Contenedor con borde, título, 3 variantes y control de padding |
| `keep-together` | Evita saltos de página dentro del contenido envuelto |
| `page-break` | Fuerza un salto de página |

### Tablas y datos

| Componente | Descripción |
|-----------|-------------|
| `table` | Tabla componible con `Table`, `TableRow`, `TableCell` |
| `data-table` | API simplificada: columnas + array de datos |
| `key-value` | Par etiqueta-valor con layout horizontal/vertical y divisores |

### Gráficos

| Componente | Descripción |
|-----------|-------------|
| `graph` | Gráficos SVG: barra, línea, área, tarta, donut, barra horizontal |

### Imágenes y elementos visuales

| Componente | Descripción |
|-----------|-------------|
| `pdf-image` | Imagen con 7 modos de visualización, ajuste y leyendas opcionales |
| `qrcode` | Código QR nativo SVG para URLs, pagos y verificación de documentos |

### Formularios

| Componente | Descripción |
|-----------|-------------|
| `form` | Layout de formulario con campos etiquetados en 1, 2 o 3 columnas |

### Encabezados y pies de página

| Componente | Descripción |
|-----------|-------------|
| `page-header` | Cabecera fija o inline con 7 variantes (incluye soporte de logo) |
| `page-footer` | Pie de página fijo o inline con 6 variantes e info de contacto |
| `page-number` | Numeración dinámica con formato y alineación personalizables |

### Decoración y estado

| Componente | Descripción |
|-----------|-------------|
| `badge` | Etiqueta inline con 7 colores y 3 tamaños |
| `alert` | Cajas de aviso: info, success, warning, error |
| `watermark` | Marca de agua diagonal o posicionada: DRAFT, CONFIDENTIAL, PAID, etc. |
| `signature` | Bloque de firma con variantes simple, doble e inline |

---

## Bloques predefinidos (10)

Los bloques son diseños completos listos para copiar. Cada uno incluye los componentes que necesita.

### Facturas / Comprobantes

| Bloque | Descripción | Componentes requeridos |
|--------|-------------|----------------------|
| `invoice-classic` | Factura A4 profesional con logo, sección de facturación y tabla con rayas | page-header, page-footer, table, key-value, section, text, pdf-image |
| `invoice-consultant` | Factura con desglose por horas, resumen de proyecto | page-header, page-footer, table, key-value, section, text, divider |
| `invoice-corporate` | Factura empresarial con campos de orden de compra y firmas | page-header, page-footer, table, key-value, text, signature |
| `invoice-creative` | Factura creativa con barra lateral de acento y tipografía moderna | page-header, page-footer, table, key-value, section, text, badge |
| `invoice-minimal` | Layout limpio con sello de factura inline y tabla compacta | page-header, page-footer, table, key-value, section, text |
| `invoice-modern` | Banner de cabecera a full width y tabla con cabecera primary | page-header, page-footer, table, key-value, section, text |

### Reportes

| Bloque | Descripción | Componentes requeridos |
|--------|-------------|----------------------|
| `report-financial` | Reporte financiero ejecutivo con KPI, gráfico de tendencias y tabla | badge, data-table, divider, graph, key-value, list, page-header, page-footer, section, stack, text |
| `report-marketing` | Informe de crecimiento con tendencias de adquisición y rendimiento de canales | badge, data-table, divider, graph, key-value, list, page-header, page-footer, section, stack, text |
| `report-operations` | Informe de operaciones con salud SLA, throughput y riesgos | badge, data-table, divider, graph, key-value, list, page-header, page-footer, section, stack, text |
| `report-security` | Postura de seguridad con tendencias de vulnerabilidades y tabla de remediación | badge, data-table, divider, graph, key-value, list, page-header, page-footer, section, stack, text |

---

## Ejemplo básico de uso

```tsx
import { Document, Page, PDFViewer } from '@react-pdf/renderer';
import { Heading } from '@/components/pdfx/heading';
import { Text } from '@/components/pdfx/text';
import { Table, TableRow, TableCell } from '@/components/pdfx/table';

function MiReporte() {
  return (
    <PDFViewer>
      <Document>
        <Page size="A4">
          <Heading level={1}>Reporte Mensual</Heading>
          <Text>Generado el {new Date().toLocaleDateString()}</Text>

          <Table>
            <TableRow>
              <TableCell>Métrica</TableCell>
              <TableCell>Valor</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Usuarios activos</TableCell>
              <TableCell>1,234</TableCell>
            </TableRow>
          </Table>
        </Page>
      </Document>
    </PDFViewer>
  );
}
```

---

## Temas

```bash
# Ver temas disponibles
npx pdfx-cli theme list

# Aplicar un tema
npx pdfx-cli theme apply <nombre-tema>
```

---

## MCP Server

pdfx-cli incluye un servidor MCP (Model Context Protocol) para integración con asistentes de IA:

```bash
npx pdfx-cli mcp
```

Esto permite que agentes como Hermes puedan interactuar con pdfx-cli directamente.

---

## Recursos

- [Registro npm de pdfx-cli](https://www.npmjs.com/package/pdfx-cli)
- [@react-pdf/renderer](https://react-pdf.org/)
- Repositorio oficial: `npx pdfx-cli@latest list` para ver componentes y bloques disponibles
- [Background Jobs](/background-jobs.md) — generar PDFs en un job asíncrono para reportes pesados
- [Notificaciones](/notificaciones.md) — enviar el PDF por email con Resend tras generarlo
