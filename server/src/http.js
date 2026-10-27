export const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export const errorHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'No se pudo procesar la solicitud.' });
};
