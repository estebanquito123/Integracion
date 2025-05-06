// app.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { WebpayPlus } = require('transbank-sdk'); // Importamos el SDK de Transbank

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true })); // Necesario para leer POST de Webpay
app.use(express.static('public'));

// Configuración de integración para Transbank
// Estas son las credenciales de prueba
const tx = new WebpayPlus.Transaction(
  WebpayPlus.commerceCode,
  WebpayPlus.apiKey,
  WebpayPlus.environment
);

// Iniciar transacción
app.post('/api/pagos/iniciar', async (req, res) => {
  const { amount, buyOrder, sessionId } = req.body;

  // URL a la que retornará el usuario después del pago
  // Directamente a tu página de resultado
  const returnUrl = 'http://localhost:8100/transbank-result';

  try {
    const response = await tx.create(buyOrder, sessionId, amount, returnUrl);
    console.log('Transacción iniciada:', response);

    // Añadir parámetro para evitar el POST de retorno
    const redirectUrl = `${response.url}?token_ws=${response.token}`;

    res.json({
      token: response.token,
      url: redirectUrl
    });
  } catch (error) {
    console.error('Error al iniciar transacción:', error);
    res.status(500).json({ error: 'No se pudo iniciar la transacción', details: error.message });
  }
});

// Endpoint para verificar estado de transacción
app.get('/api/pagos/verificar/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const response = await tx.status(token);
    console.log('Estado de transacción:', response);
    res.json(response);
  } catch (error) {
    console.error('Error al verificar estado:', error);
    res.status(500).json({ error: 'No se pudo verificar el estado', details: error.message });
  }
});

// Endpoint para commit (confirmar) la transacción
app.post('/api/pagos/confirmar', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token no proporcionado' });
  }

  try {
    const response = await tx.commit(token);
    console.log('Transacción confirmada:', response);
    res.json(response);
  } catch (error) {
    console.error('Error al confirmar transacción:', error);
    res.status(500).json({ error: 'No se pudo confirmar la transacción', details: error.message });
  }
});

// Ruta para debugging - recibe todos los parámetros de Transbank
app.all('/api/pagos/debug', (req, res) => {
  console.log('Método:', req.method);
  console.log('Headers:', req.headers);
  console.log('Query:', req.query);
  console.log('Body:', req.body);

  // Simplemente responder con la info recibida
  res.json({
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body
  });
});

// Escuchar
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
