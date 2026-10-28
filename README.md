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
- MySQL: `localhost:3306`

La base de datos se inicializa automáticamente en el primer arranque. Para reinicializarla, ejecuta `docker compose down -v` y vuelve a iniciarla.

## Reparar caracteres incorrectos

MySQL usa `utf8mb4`. Si tu base ya contiene textos como `SuscripciÃ³n` o `vÃ­deo`, con MySQL en ejecución ejecuta una vez:

```bash
npm run db:repair-encoding --workspace server
```

El comando solo modifica campos que contienen los patrones de codificación dañada `Ã` o `Â`.
