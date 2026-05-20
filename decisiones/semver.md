# Semantic Versioning

## Esquema

```
v1.0.0 → v1.1.0 → v2.0.0
  ^        ^        ^
  major    minor    patch
```

| Versión | Cambio | Ejemplo |
|---|---|---|
| **MAJOR** | Breaking change | `v1.0.0` → `v2.0.0` |
| **MINOR** | Nueva feature (backward compatible) | `v1.0.0` → `v1.1.0` |
| **PATCH** | Bugfix (backward compatible) | `v1.0.0` → `v1.0.1` |

## Changelog Automático con standard-version

```bash
npm install -D standard-version
```

En `package.json`:

```json
"scripts": {
  "release": "standard-version",
  "release:minor": "standard-version --release-as minor",
  "release:major": "standard-version --release-as major"
}
```

Esto genera `CHANGELOG.md` automáticamente desde los **Conventional Commits** y crea el tag git.

## Publicar Release

```bash
npm run release
git push --follow-tags origin main
gh release create v1.1.0 --generate-notes
```

## Convención de Commits

| Tipo | Uso |
|---|---|
| `feat:` | Nueva feature |
| `fix:` | Bugfix |
| `refactor:` | Refactor sin cambio funcional |
| `test:` | Tests |
| `docs:` | Documentación |
| `chore:` | Mantenimiento |
| `ci:` | CI/CD |
