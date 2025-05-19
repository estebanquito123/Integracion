const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const { WebpayPlus } = require('transbank-sdk');

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Configuración CORS para web, APK y producción
const corsOptions = {
  origin: [
    'http://localhost:8100',         // App web local (Ionic)
    'http://localhost:4200',         // Angular local
    'capacitor://localhost',         // APK con Capacitor
    'ionic://localhost',             // App Ionic en iOS/Android
    'https://tudominio.com'          // 🔁 Agregá tu dominio de producción si aplica
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());

// 🔁 Función auxiliar para formatear data en notificaciones FCM
function formatFCMData(data) {
  const result = {};
  if (data) {
    Object.keys(data).forEach(key => {
      result[key] = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
    });
  }
  return result;
}

// 🚀 Transacciones Transbank
const transaction = new WebpayPlus.Transaction();

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

// 🔔 Notificaciones Push para Vendedor
app.post('/api/notificar-vendedor', async (req, res) => {
  const { token, title, body, data } = req.body;

  const message = {
    token,
    notification: {
      title,
      body
    },
    data: {
      ...formatFCMData(data),
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'vendedor_channel',
        notificationPriority: 'PRIORITY_HIGH',
        defaultSound: true,
        defaultVibrateTimings: true,
        defaultLightSettings: true
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true
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
    console.error('Error enviando push al vendedor:', error);
    res.status(500).json({ error: 'Fallo al enviar notificación al vendedor', details: error.message });
  }
});

// 🔔 Notificación Push para Cliente
app.post('/api/notificar-cliente', async (req, res) => {
  const { token, title, body, data } = req.body;

  const message = {
    token,
    notification: {
      title,
      body
    },
    data: {
      ...formatFCMData(data),
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'cliente_channel',
        notificationPriority: 'PRIORITY_HIGH',
        defaultSound: true,
        defaultVibrateTimings: true,
        defaultLightSettings: true
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true
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

// 🔔 Notificación Push para Bodeguero
app.post('/api/notificar-bodeguero', async (req, res) => {
  const { token, title, body, data } = req.body;

  const message = {
    token,
    notification: {
      title,
      body
    },
    data: {
      ...formatFCMData(data),
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'bodeguero_channel',
        notificationPriority: 'PRIORITY_HIGH',
        defaultSound: true,
        defaultVibrateTimings: true,
        defaultLightSettings: true
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true
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

// 🔍 Endpoint de prueba para tokens
app.post('/api/test-notification', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Se requiere un token FCM' });
  }

  const message = {
    token,
    notification: {
      title: 'Prueba de Notificación',
      body: 'Esta es una notificación de prueba para verificar la configuración.'
    },
    data: {
      type: 'test',
      timestamp: Date.now().toString()
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'test_channel',
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

// 🧪 Endpoint de diagnóstico para tokens
app.post('/api/debug-fcm', async (req, res) => {
  const { token, details } = req.body;

  try {
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

// 🟢 Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
