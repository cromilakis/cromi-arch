# Flujo de Subida de Archivos con Supabase Storage

## Diagrama del Flujo

```
Cliente → Server Action → Supabase Storage → URL firmada → Cliente
   1. Selecciona archivo
   2. Valida tipo/tamaño (cliente)
   3. Envía a Server Action
   4. Server valida (servidor)
   5. Sube a Supabase Storage
   6. Genera URL firmada
   7. Guarda referencia en DB (Prisma)
   8. Devuelve URL al cliente
```

## Validación de Archivos

### Validación en el Cliente

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Tipo de archivo no soportado';
  if (file.size > MAX_SIZE) return 'El archivo excede 5MB';
  return null;
}
```

### Validación en el Servidor (Server Action)

```typescript
'use server';
import sharp from 'sharp';

export async function uploadFile(formData: FormData) {
  const file = formData.get('file') as File;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Validar dimensiones (imágenes)
  const metadata = await sharp(buffer).metadata();
  if (metadata.width! > 4000 || metadata.height! > 4000) {
    return { error: 'Dimensiones máximas: 4000x4000px' };
  }

  // Optimizar imagen
  const optimized = await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // Subir a Supabase Storage
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(`users/${userId}/${Date.now()}.webp`, optimized);
}
```

## URLs Firmadas (Signed URLs)

Para acceso seguro sin hacer el bucket público:

```typescript
// Generar URL firmada con expiración
const { data } = await supabase.storage
  .from('uploads')
  .createSignedUrl(filePath, 3600); // expira en 1 hora

return data?.signedUrl;
```

## Patrón de UI con Progreso de Subida

```typescript
function FileUpload() {
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local
    setPreview(URL.createObjectURL(file));

    // Subir con progreso simulado (o usar XMLHttpRequest para eventos reales)
    for (let p = 0; p <= 100; p += 10) {
      setProgress(p);
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleUpload} />
      {preview && <img src={preview} alt="Preview" className="w-32 h-32 object-cover" />}
      {progress > 0 && <progress value={progress} max={100} />}
    </div>
  );
}
```

## Tabla de Referencia en Prisma

```prisma
model File {
  id        String   @id @default(cuid())
  url       String
  path      String   @unique
  mimeType  String
  size      Int
  userId    String
  createdAt DateTime @default(now())
}
```
