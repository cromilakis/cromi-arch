# Mensajes de Error para el Usuario

> INVESTIGADO: Error message UX patterns, i18n integration, toast/snackbar best practices.

## 1. Mapeo de errores técnicos a mensajes amigables

```tsx
// src/lib/errores.ts
const MAPEO_ERRORES: Record<string, { titulo: string; mensaje: string }> = {
  'P2002': {
    titulo: 'Datos duplicados',
    mensaje: 'Ya existe un registro con ese valor. Por favor, intenta con otro.',
  },
  'P2025': {
    titulo: 'Registro no encontrado',
    mensaje: 'El elemento que buscas no existe o fue eliminado.',
  },
  'STRIPE_DECLINED': {
    titulo: 'Pago rechazado',
    mensaje: 'La tarjeta fue rechazada. Verifica los datos e intenta de nuevo.',
  },
  'RATE_LIMIT': {
    titulo: 'Demasiadas solicitudes',
    mensaje: 'Has realizado demasiadas acciones. Espera unos minutos y vuelve a intentar.',
  },
  'AUTH_EXPIRED': {
    titulo: 'Sesión expirada',
    mensaje: 'Tu sesión ha expirado. Inicia sesión nuevamente para continuar.',
  },
};

export function errorParaUsuario(error: unknown): { titulo: string; mensaje: string } {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return MAPEO_ERRORES[error.code] || ERROR_FALLBACK;
  }
  // ... más tipos de error
  return ERROR_FALLBACK;
}
```

## 2. Mensaje de fallback

```tsx
const ERROR_FALLBACK = {
  titulo: 'Algo salió mal',
  mensaje: 'Ocurrió un error inesperado. Nuestro equipo ha sido notificado. Por favor, intenta de nuevo más tarde.',
};
```

## 3. Componente de Error Message

```tsx
// src/components/ui/error-message.tsx
interface ErrorMessageProps {
  error?: unknown;
  onReintentar?: () => void;
  variante?: 'toast' | 'banner' | 'inline';
}

export function ErrorMessage({ error, onReintentar, variante = 'inline' }: ErrorMessageProps) {
  const { titulo, mensaje } = errorParaUsuario(error);

  return (
    <div className={`error-message error-${variante}`}>
      <h4>{titulo}</h4>
      <p>{mensaje}</p>
      {onReintentar && (
        <button onClick={onReintentar}>Reintentar</button>
      )}
    </div>
  );
}
```

## 4. Consistencia de tono y estilo

| Elemento | Estilo |
|----------|--------|
| Tono | Empático, no técnico |
| Extensión | Máximo 2 líneas |
| Acción | Siempre sugerir qué hacer |
| Idioma | Español neutro (tú) |

## 5. Buenas prácticas

- **Nunca** mostrar stack traces o códigos de error internos al usuario
- **Siempre** loguear el error completo en Sentry
- Usar `console.error` + Sentry en desarrollo, solo Sentry en producción
- Incluir un botón de "Reintentar" para errores recuperables
- Para errores de red: "No pudimos conectar con el servidor. Verifica tu conexión a internet."
- Para errores de validación: el mensaje debe indicar exactamente qué campo corregir

```tsx
// Ejemplo de error de formulario
<Input
  name="email"
  error={errores.email && 'El correo electrónico no tiene un formato válido'}
/>
```
