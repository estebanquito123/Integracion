
//app.js(backend)
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

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
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
app.post('/api/notificar-vendedor', async (req, res) => {
  const { token, title, body, data } = req.body;

  // Convert data object to strings (FCM requirement)
  const formattedData = {};
  if (data) {
    Object.keys(data).forEach(key => {
      formattedData[key] = typeof data[key] === 'object'
        ? JSON.stringify(data[key])
        : String(data[key]);
    });
  }

  const message = {
    token,
    notification: {
      title,
      body,
      sound: 'default',
      badge: '1',
      icon: 'notification_icon',
      android_channel_id: 'vendedor_channel'
    },
    data: {
      ...formattedData,
      click_action: 'FLUTTER_NOTIFICATION_CLICK' // Important for handling
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        notification_priority: 'PRIORITY_HIGH',
        default_sound: true,
        default_vibrate_timings: true,
        default_light_settings: true
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          content_available: 1
        }
      },
      headers: {
        'apns-priority': '10'
      }
    }
  };

  try {
    await admin.messaging().send(message);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error enviando push:', error);
    res.status(500).json({ error: 'Fallo al enviar notificación', details: error.message });
  }
});

// Apply the same improvements to notificar-cliente and notificar-bodeguero endpoints
app.post('/api/notificar-cliente', async (req, res) => {
  const { token, title, body, data } = req.body;

  // Convert data object to strings (FCM requirement)
  const formattedData = {};
  if (data) {
    Object.keys(data).forEach(key => {
      formattedData[key] = typeof data[key] === 'object'
        ? JSON.stringify(data[key])
        : String(data[key]);
    });
  }

  const message = {
    token,
    notification: {
      title,
      body,
      sound: 'default',
      badge: '1',
      icon: 'notification_icon',
      android_channel_id: 'cliente_channel'
    },
    data: {
      ...formattedData,
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        notification_priority: 'PRIORITY_HIGH',
        default_sound: true,
        default_vibrate_timings: true,
        default_light_settings: true
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          content_available: 1
        }
      },
      headers: {
        'apns-priority': '10'
      }
    }
  };

  try {
    await admin.messaging().send(message);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error enviando push al cliente:', error);
    res.status(500).json({ error: 'Fallo al enviar notificación al cliente', details: error.message });
  }
});

app.post('/api/notificar-bodeguero', async (req, res) => {
  const { token, title, body, data } = req.body;

  // Convert data object to strings (FCM requirement)
  const formattedData = {};
  if (data) {
    Object.keys(data).forEach(key => {
      formattedData[key] = typeof data[key] === 'object'
        ? JSON.stringify(data[key])
        : String(data[key]);
    });
  }

  const message = {
    token,
    notification: {
      title,
      body,
      sound: 'default',
      badge: '1',
      icon: 'notification_icon',
      android_channel_id: 'bodeguero_channel'
    },
    data: {
      ...formattedData,
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        notification_priority: 'PRIORITY_HIGH',
        default_sound: true,
        default_vibrate_timings: true,
        default_light_settings: true
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          content_available: 1
        }
      },
      headers: {
        'apns-priority': '10'
      }
    }
  };

  try {
    await admin.messaging().send(message);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error enviando push al bodeguero:', error);
    res.status(500).json({ error: 'Fallo al enviar notificación al bodeguero', details: error.message });
  }
});

// Add a diagnostic endpoint to test tokens
app.post('/api/test-notification', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Se requiere un token FCM' });
  }

  const message = {
    token,
    notification: {
      title: 'Prueba de Notificación',
      body: 'Esta es una notificación de prueba para verificar la configuración.',
      sound: 'default'
    },
    data: {
      type: 'test',
      timestamp: Date.now().toString()
    },
    android: {
      priority: 'high',
      notification: {
        channel_id: 'test_channel',
        priority: 'high'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      },
      headers: {
        'apns-priority': '10'
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({
      success: true,
      messageId: response,
      message: 'Notificación de prueba enviada correctamente'
    });
  } catch (error) {
    console.error('Error enviando notificación de prueba:', error);
    res.status(500).json({
      error: 'Error al enviar notificación de prueba',
      details: error.message,
      errorCode: error.code
    });
  }
});

// 2. Setup error logging for FirebaseMessaging in app.js
// Implement a detailed diagnostic log
app.post('/api/debug-fcm', async (req, res) => {
  const { token, details } = req.body;

  try {
    // Store debug information
    await admin.firestore().collection('fcm_diagnostics').add({
      token: token || 'no-token',
      details: details || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging FCM diagnostic info:', error);
    res.status(500).json({ error: 'Error al guardar diagnóstico' });
  }
});
