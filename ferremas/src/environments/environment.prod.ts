//environtment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions',
  googleMapsApiKey: "AIzaSyCgkoiLpJBZyt0B7KYn1VgsMqPNe_VVowU",
  firebaseConfig: {
    apiKey: "AIzaSyDSAO1qifKDwFk2kX7wO9XWA9NSgFM5NVs",
    authDomain: "ferremas2-19f3f.firebaseapp.com",
    projectId: "ferremas2-19f3f",
    storageBucket: "ferremas2-19f3f.firebasestorage.app",
    messagingSenderId: "447290215984",
    appId: "1:447290215984:web:6ebd14885dfb1fef2727f5",
    measurementId: "G-GNF7MK90Y7"
  },
  backendApiUrl: 'https://integracion-7xjk.onrender.com/api',
  transbankConfig: {
    // Para ambiente de integración/desarrollo
    commerceCode: '597055555532',  // Código de comercio de prueba
    apiKey: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',  // Clave secreta de prueba
    environment: 'TEST'  // TEST o LIVE
  }

};
