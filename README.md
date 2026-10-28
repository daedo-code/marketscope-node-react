# MarketScope

Plataforma de inteligencia de mercados: empresas, mercados y oportunidades de negocio.

## Requisitos

- Node.js 20 o superior
- Docker y Docker Compose

## Inicio

```bash
docker compose up -d
npm install
npm run dev
```

- Aplicación: http://localhost:5173
- API: http://localhost:3001/api/health
- MySQL: `localhost:3313`

## Docker

El servicio de MySQL no usa perfiles, por lo que puedes levantar solo la base de datos para una ejecución de producción sin contenedores para la aplicación:

```bash
npm run docker:db
```

Para desarrollo local, levanta también la API y el cliente con el perfil `app`:

```bash
npm run docker:local
```

También puedes usar los comandos de Docker directamente:

```bash
docker compose up -d mysql
docker compose --profile app up --build
```

La aplicación local estará disponible en http://localhost:5173 y la API en http://localhost:3001.

La base de datos se inicializa automáticamente en el primer arranque. Para reinicializarla, ejecuta `docker compose down -v` y vuelve a iniciarla.

## Reparar caracteres incorrectos

MySQL usa `utf8mb4`. Si tu base ya contiene textos como `SuscripciÃ³n` o `vÃ­deo`, con MySQL en ejecución ejecuta una vez:

```bash
npm run db:repair-encoding --workspace server
```

El comando solo modifica campos que contienen los patrones de codificación dañada `Ã` o `Â`.
