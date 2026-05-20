# Seguridad en la Cadena de Suministro (Supply Chain Security)

La seguridad en la cadena de suministro de software es crítica para prevenir ataques que introducen código malicioso a través de dependencias de terceros. A continuación se presentan las principales amenazas y mejores prácticas para mitigarlas.

## Dependency Confusion

**¿Qué es?** Es un ataque donde un paquete malicioso con el mismo nombre que un paquete interno se publica en un registro público (npmjs.org). Si el gestor de paquetes resuelve primero el registro público, instala el paquete malicioso.

**Prevención:**

- **Scoped packages**: Usa el scope `@tu-org/` para todos los paquetes internos. npm nunca resolverá un scoped package desde un registro que no tenga ese scope configurado.
- **`.npmrc` con registro privado**: Configura el scope para que apunte exclusivamente a tu registro privado:

```ini
@tu-org:registry=https://registry.tudominio.com/
registry=https://registry.npmjs.org/
```

## Scripts de Instalación (`postinstall`, `preinstall`)

Los scripts de instalación (`postinstall`, `preinstall`, `prepare`) se ejecutan automáticamente al instalar un paquete. Un atacante puede inyectar malware aquí.

**Mitigación:**

1. Configura `ignore-scripts=true` como valor por defecto global:

```bash
npm config set ignore-scripts true
```

2. En `.npmrc` del proyecto:

```ini
ignore-scripts=true
```

3. Habilita scripts solo para paquetes de confianza usando `--ignore-scripts=false` temporalmente en instalaciones controladas, o revisa manualmente los scripts de cada paquete sospechoso con:

```bash
npm pack <paquete>
tar -xf <paquete>-*.tgz && cat package.json | grep scripts
```

## Escaneo de Dependencias

Herramientas recomendadas para detectar malware y vulnerabilidades:

| Herramienta | Enfoque | Ventaja clave |
|-------------|---------|---------------|
| **Socket.dev** | Detecta malware, scripts sospechosos, y riesgos de comportamiento | No solo CVEs — detecta *malware y riesgos de mantenimiento* |
| **Snyk** | Base de datos curada de vulnerabilidades | Contexto de explotabilidad y remediación |
| **npm audit** | Escaneo contra la base de datos de GitHub Advisory | Gratuito y nativo del ecosistema npm |

> **Socket.dev** es particularmente útil porque analiza el *comportamiento* del paquete (llamadas a red, acceso a sistema de archivos, etc.) y no solo CVEs conocidos.

## Verificación del Lockfile en CI

En pipelines de CI/CD, **nunca uses `npm install`** — usa `npm ci`:

```yaml
# ❌ Incorrecto: npm install puede modificar el lockfile
- run: npm install

# ✅ Correcto: npm ci falla si el lockfile no coincide
- run: npm ci
```

**`npm ci`**: Instala exactamente lo que está en `package-lock.json`. Si el lockfile ha sido modificado o no coincide con `package.json`, el build falla.

Además, es buena práctica **comparar el hash del lockfile** entre builds para detectar cambios no autorizados:

```bash
sha256sum package-lock.json > lockfile-hash.txt
git diff --exit-code package-lock.json
```

## Revisión Periódica

Establece un schedule de auditoría de dependencias críticas **antes de agregarlas**:

1. **Semanal**: Revisar alertas de dependencias actuales (`npm audit`, Socket.dev alerts).
2. **Por cada nueva dependencia**: Revisar reputación, maintainers, frecuencia de actualizaciones, scripts de instalación.
3. **Trimestral**: Auditoría completa del árbol de dependencias (incluyendo dependencias transitivas).

## Ejemplo de `.npmrc` Seguro

```ini
; === Seguridad ===
ignore-scripts=true
registry=https://registry.npmjs.org/
@tu-org:registry=https://registry.tudominio.com/

; === Auditoría ===
audit-level=high
fund=false

; === Cache y performance ===
cache=/tmp/npm-cache
prefer-offline=true
```

Este archivo debe estar en la raíz del proyecto y versionado en Git.
