# Fuentes de Inteligencia de Vulnerabilidades

Monitorear vulnerabilidades **nuevas en tiempo real** es fundamental para mantener una postura de seguridad proactiva. A continuación se listan las fuentes más relevantes, cómo recibir alertas automáticas y qué hacer cuando llega una notificación.

## Dónde Monitorear Vulnerabilidades Nuevas

### GitHub Advisory Database
- **URL**: [github.com/advisories](https://github.com/advisories)
- **Ecosistema**: npm, PyPI, Go, RubyGems, Maven, NuGet, etc.
- **Características**: Base de datos oficial con CVE asignados por GitHub. Soporta filtros por ecosistema y severidad.
- **Alertas**: RSS feed disponible. También notificaciones automáticas si tienes el repositorio en watch.

### NVD (National Vulnerability Database)
- **URL**: [nvd.nist.gov](https://nvd.nist.gov)
- **Ecosistema**: Todos (multiplataforma)
- **Características**: Feed oficial de CVE del gobierno de EE.UU. Incluye puntuación CVSS v3/v4, vectores de ataque y referencias.
- **Alertas**: RSS/Atom feeds por fecha de publicación. API REST para integraciones.

### Snyk Vulnerability DB
- **URL**: [security.snyk.io](https://security.snyk.io)
- **Ecosistema**: npm, Maven, PyPI, Docker, Terraform, etc.
- **Características**: Base de datos curada con análisis de impacto real. Incluye información de explotabilidad y pasos de remediación.
- **Alertas**: Monitoreo continuo via Snyk CLI o integración CI/CD.

### OWASP
- **URL**: [owasp.org](https://owasp.org)
- **Ecosistema**: General (seguridad de aplicaciones)
- **Características**: Top 10 de vulnerabilidades web (actualizado periódicamente), proyectos como Dependency-Check y ASVS.
- **Alertas**: Lista de correo OWASP, blog y boletines trimestrales.

### The Hacker News
- **URL**: [thehackernews.com](https://thehackernews.com)
- **Ecosistema**: Vulnerabilidades activas en el mundo real
- **Características**: Noticias de seguridad en tiempo real, exploits activos, breach reports.
- **Alertas**: RSS feed, boletín diario por email.

## Cómo Recibir Alertas Automáticas

| Método | Fuente | Configuración |
|--------|--------|---------------|
| **GitHub Watch** | GitHub Advisory DB | Ir al repo → Watch → Custom → Security alerts |
| **Dependabot** | GitHub Advisory + NVD | Habilitar en Settings → Security & analysis → Dependabot alerts |
| **Socket.dev** | Socket Security Research | Crear cuenta, añadir repositorio, configurar webhooks/slack |
| **RSS Feeds** | NVD, The Hacker News, GitHub Advisories | Usar lector RSS (Feedly, Miniflux, Newsboat) |

## ¿Qué Hacer Cuando Llega una Alerta?

Sigue este proceso estructurado para responder a cada alerta de vulnerabilidad:

### 1. Identificar si Afecta Nuestro Stack
Verifica el ecosistema afectado (npm, pip, etc.) y las versiones vulnerables reportadas vs. las que usamos.

### 2. Revisar si Tenemos el Paquete Vulnerable

```bash
# Buscar si un paquete específico está en el árbol de dependencias
npm ls <nombre-del-paquete>

# Listar dependencias directas con versiones
npm list --depth=0

# Ver dependencias transitivas
npm ls --all | grep <nombre-del-paquete>
```

### 3. Evaluar Severidad y Exposición Real
- **CVSS Score**: > 9.0 (crítico), > 7.0 (alto), > 4.0 (medio)
- **Explotabilidad**: ¿Existe PoC público? ¿Se requiere interacción del usuario?
- **Exposición**: ¿Es accesible desde Internet? ¿Está en un entorno productivo?

### 4. Aplicar Parche o Workaround
- `npm update <paquete>` (si hay versión parcheada)
- `npm audit fix` (remediación automática para vulnerabilidades conocidas)
- Si no hay parche: evaluar workaround (desactivar funcionalidad, agregar WAF rule, etc.)

### 5. Documentar en ADR (si fue significativo)
Para vulnerabilidades críticas o que requirieron cambios arquitectónicos, documentar en un Architecture Decision Record (ADR):
- Descripción de la vulnerabilidad
- Impacto en el sistema
- Decisión tomada (parche, workaround, reemplazo de librería)
- Fecha y responsables

---

> **Tip**: Integra este flujo en tu pipeline CI/CD. Si una alerta es de severidad `critical` y afecta a producción, el build debe fallar automáticamente.
