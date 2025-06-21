import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// IMPORTA TUS TESTS MANUALMENTE AQUÍ:
import './app/servicios/carrito.service.spec';// si tienes un dummy test
// Añade más archivos .spec.ts aquí según necesites
