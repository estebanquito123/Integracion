//environment.ts:
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions',
  googleMapsApiKey: "AIzaSyCgkoiLpJBZyt0B7KYn1VgsMqPNe_VVowU",
  firebaseConfig :{
    apiKey: "AIzaSyDSAO1qifKDwFk2kX7wO9XWA9NSgFM5NVs",
    authDomain: "ferremas2-19f3f.firebaseapp.com",
    projectId: "ferremas2-19f3f",
    storageBucket: "ferremas2-19f3f.firebasestorage.app",
    messagingSenderId: "447290215984",
    appId: "1:447290215984:web:6ebd14885dfb1fef2727f5",
    measurementId: "G-GNF7MK90Y7"
  },
  backendApiUrl: 'http://localhost:3000/api',
  transbankConfig: {
    // Para ambiente de integración/desarrollo
    commerceCode: '597055555532',  // Código de comercio de prueba
    apiKey: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',  // Clave secreta de prueba
    environment: 'TEST'  // TEST o LIVE
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
