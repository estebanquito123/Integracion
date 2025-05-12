
//app.js(backend)
const admin = require('firebase-admin');
require('dotenv').config(); //

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { WebpayPlus } = require('transbank-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Instancia de Transacción
const transaction = new WebpayPlus.Transaction();

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
/*app.post('/api/pagos/confirmar', async (req, res) => {
  const { token_ws } = req.body;

  try {
    const response = await transaction.commit(token_ws);
    res.json(response);
  } catch (error) {
    console.error('Error al confirmar transacción:', error);
    res.status(500).json({ error: 'No se pudo confirmar la transacción' });
  }
});*/

// Verificar transacción
app.get('/api/pagos/verificar/:token', async (req, res) => {
  const token = req.params.token;

  try {
    const response = await transaction.commit(token);
    res.json(response);
  } catch (error) {
    console.error('Error al verificar transacción:', error);
    res.status(400).json({ error: 'No se pudo verificar la transacción' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
app.post('/api/notificar-vendedor', async (req, res) => {
  const { token, title, body, data } = req.body;

  const message = {
    token,
    notification: {
      title,
      body
    },
    data
  };

  try {
    await admin.messaging().send(message);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error enviando push:', error);
    res.status(500).json({ error: 'Fallo al enviar notificación' });
  }
});
