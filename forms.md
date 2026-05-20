# Form Handling con React Hook Form + Zod

> INVESTIGADO: react-hook-form.com/docs, zod.dev, @hookform/resolvers.

Patrón unificado para formularios con validación compartida entre cliente y servidor.

React Hook Form v7 usa componentes no controlados para mejor performance. Soporta `Controller` para inputs controlados (shadcn/ui, MUI) y validación schema con Zod.

## Esquema Zod compartido

El schema vive en un archivo compartido para reusarlo en cliente y API routes:

```typescript
// src/validations/register.ts
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener una mayúscula')
    .regex(/[0-9]/, 'Debe contener un número'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

## Componente InputField reutilizable

```typescript
// src/components/ui/input-field.tsx
import { type UseFormRegisterReturn } from 'react-hook-form';

interface Props {
  label: string;
  error?: string;
  type?: string;
  registration: UseFormRegisterReturn;
}

export function InputField({ label, error, type = 'text', registration }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        {...registration}
        className={`border rounded px-3 py-2 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

## Formulario completo con validación cliente

```typescript
// src/app/(auth)/register/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { registerSchema, type RegisterInput } from '@/validations/register';
import { InputField } from '@/components/ui/input-field';
import { useRouter } from 'next/navigation';

async function submitRegister(data: RegisterInput) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Error al registrarse');
  }
  return res.json();
}

export default function RegisterPage() {
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: submitRegister,
    onSuccess: () => router.push('/login?registered=true'),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">Crear cuenta</h1>

      <InputField
        label="Nombre"
        registration={register('name')}
        error={errors.name?.message}
      />
      <InputField
        label="Email"
        type="email"
        registration={register('email')}
        error={errors.email?.message}
      />
      <InputField
        label="Contraseña"
        type="password"
        registration={register('password')}
        error={errors.password?.message}
      />

      {mutation.error && (
        <p className="text-red-600 text-sm">{mutation.error.message}</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {mutation.isPending ? 'Registrando...' : 'Registrarse'}
      </button>
    </form>
  );
}
```

## Server-side validation en API Route

Siempre validar del lado del servidor aunque el cliente ya lo haga:

```typescript
// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { registerSchema } from '@/validations/register';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validación server-side con el mismo schema
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { message: 'El email ya está registrado' },
        { status: 409 }
      );
    }

    // Hash password y crear usuario...
    // ...

    logger.info('User registered', { email });
    return NextResponse.json({ success: true }, { status: 201 });

  } catch (error) {
    logger.error('Register error', error as Error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

## Controller para inputs controlados (shadcn/ui)

Cuando usas shadcn/ui u otras librerías que no exponen ref, usa `Controller`:

```tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const FormSchema = z.object({
  username: z.string().min(2, { message: 'Mínimo 2 caracteres.' }),
});

export function InputForm() {
  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: { username: '' },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Usuario</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Enviar</button>
      </form>
    </Form>
  );
}
```

## Server Actions con React Hook Form

Para Server Actions en Next.js App Router con RHF:

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/validations/register';
import { registerAction } from '@/features/auth/actions';

export function RegisterForm() {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    const result = await registerAction(data);
    if (result?.fieldErrors) {
      Object.entries(result.fieldErrors).forEach(([field, message]) => {
        setError(field as keyof RegisterInput, { message });
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* ... campos del formulario ... */}
    </form>
  );
}
```

## Resumen del patrón

1. **Zod schema** compartido en `src/validations/`
2. **Client validation** con `zodResolver` en React Hook Form
3. **Server validation** con `safeParse` en Server Action / API Route
4. **Controller** para inputs controlados (shadcn/ui)
5. **Error handling** unificado: muestra errores del servidor en el formulario
