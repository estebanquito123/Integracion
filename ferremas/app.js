// app.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { WebpayPlus } = require('transbank-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Instancia de Transacción (usa configuración por defecto de integración)
const transaction = new WebpayPlus.Transaction();

app.use(express.static('public'));


// Iniciar una transacción
app.post('/api/pagos/iniciar', async (req, res) => {
  const { amount, buyOrder, sessionId, returnUrl } = req.body;

  try {
    const response = await transaction.create(buyOrder, sessionId, amount, returnUrl);
    res.json({
      token: response.token,
      url: response.url
    });
  } catch (error) {
    console.error('Error al iniciar transacción con Transbank:', error);
    res.status(500).json({ error: 'No se pudo iniciar la transacción' });
  }
});

// Confirmar transacción
app.post('/api/pagos/confirmar', async (req, res) => {
  const { token_ws } = req.body;

  try {
    const response = await transaction.commit(token_ws);
    res.json(response);
  } catch (error) {
    console.error('Error al confirmar transacción:', error);
    res.status(500).json({ error: 'No se pudo confirmar la transacción' });
  }
});

// Escuchar
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
