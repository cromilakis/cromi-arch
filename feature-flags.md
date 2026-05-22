# Feature Flags

## 1. Implementación sin servicios externos

```tsx
// src/lib/feature-flags.ts
type FeatureFlag = {
  clave: string;
  habilitado: boolean;
  porcentajeUsuarios?: number; // 0-100
  usuariosHabilitados?: string[]; // IDs específicos
};
```

## 2. Flags basados en entorno

```tsx
const FLAGS_ENTORNO = {
  NUEVO_DASHBOARD: process.env.FLAG_NUEVO_DASHBOARD === 'true',
  MODO_MANTENIMIENTO: process.env.FLAG_MODO_MANTENIMIENTO === 'true',
  EXPORTAR_PDF: process.env.VERCEL_ENV === 'production',
};
```

Archivo `.env` de ejemplo:

```
FLAG_NUEVO_DASHBOARD=true
FLAG_MODO_MANTENIMIENTO=false
FLAG_BETA_PAGOS=false
```

## 3. Rollout gradual por usuario

```tsx
async function flagHabilitado(usuarioId: string, clave: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { clave } });
  if (!flag) return false;
  if (!flag.habilitado) return false;

  // Flag activa para todos
  if (flag.porcentajeUsuarios >= 100) return true;

  // Hash del usuario para distribución uniforme
  const hash = hashUsuario(usuarioId, clave);
  return hash < flag.porcentajeUsuarios / 100;
}
```

## 4. Estructura para A/B Testing

```prisma
model FeatureFlag {
  id                String   @id @default(cuid())
  clave             String   @unique
  descripcion       String?
  habilitado        Boolean  @default(false)
  porcentajeUsuarios Int?    @default(0)
  variante          String?  // "A", "B" o null
  creadoEn          DateTime @default(now())
  actualizadoEn     DateTime @updatedAt
}
```

Para A/B testing:

```tsx
const variante = await asignarVariante(usuarioId, 'experimento-checkout');
// variante = "A" (control) o "B" (nuevo flujo)
```

## 5. Limpieza de flags antiguos

Cuando una funcionalidad está 100% liberada:

1. Eliminar la flag de la BD
2. Remover los condicionales del código
3. Eliminar la variable de entorno (si aplica)
4. Dejar solo la implementación definitiva

```bash
# Script de limpieza
npx ts-node scripts/limpiar-flags.ts --flag=FLAG_OLD_DASHBOARD
```

## Referencias

- [Analítica](/analytics.md) — combinar feature flags con eventos analíticos para medir adopción
- [Estrategia .env](/decisiones/env-strategy.md) — flags de entorno (`FEATURE_X=true`) para activación por entorno
- [Testing](/testing.md) — testear ambas ramas (flag ON / OFF) con BDD
