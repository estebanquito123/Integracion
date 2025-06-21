import { TestBed } from '@angular/core/testing';
import { CarritoService } from './carrito.service';
import { Producto } from '../models/bd.models';

describe('CarritoService - getTotal()', () => {
  let service: CarritoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CarritoService);

    // Limpiar localStorage antes de cada test
    localStorage.clear();

    // Limpiar el carrito antes de cada test
    service.clearCart();
  });

  afterEach(() => {
    // Limpiar localStorage después de cada test
    localStorage.clear();
  });

  describe('Cálculo del total del carrito', () => {

    it('debe retornar 0 cuando el carrito está vacío', () => {
      // Arrange
      const expectedTotal = 0;

      // Act
      const total = service.getTotal();

      // Assert
      expect(total).toBe(expectedTotal);
    });

    it('debe calcular correctamente el total con un solo producto sin cantidad definida', () => {
      // Arrange
      const producto: Producto = {
        id: '1',
        nombre: 'Producto Test',
        precio: 100,
        imagen: 'imagen.jpg',
        stock: 10,
        cantidad: 0
      };
      const expectedTotal = 100;

      // Act
      service.addItem(producto);
      const total = service.getTotal();

      // Assert
      expect(total).toBe(expectedTotal);
    });

    it('debe calcular correctamente el total con un solo producto con cantidad definida', () => {
      // Arrange
      const producto: Producto = {
        id: '1',
        nombre: 'Producto Test',
        precio: 50,
        cantidad: 3,
        imagen: 'imagen.jpg',
        stock: 10
      };
      const expectedTotal = 150; // 50 * 3

      // Act
      service.setItems([producto]);
      const total = service.getTotal();

      // Assert
      expect(total).toBe(expectedTotal);
    });

    it('debe calcular correctamente el total con múltiples productos diferentes', () => {
      // Arrange
      const productos: Producto[] = [
        {
          id: '1',
          nombre: 'Producto 1',
          precio: 100,
          cantidad: 2,
          imagen: 'imagen1.jpg',
          stock: 10
        },
        {
          id: '2',
          nombre: 'Producto 2',
          precio: 75,
          cantidad: 1,
          imagen: 'imagen2.jpg',
          stock: 5
        },
        {
          id: '3',
          nombre: 'Producto 3',
          precio: 25,
          cantidad: 4,
          imagen: 'imagen3.jpg',
          stock: 20
        }
      ];
      const expectedTotal = 375; // (100*2) + (75*1) + (25*4) = 200 + 75 + 100

      // Act
      service.setItems(productos);
      const total = service.getTotal();

      // Assert
      expect(total).toBe(expectedTotal);
    });

    it('debe manejar productos con cantidad undefined como cantidad 1', () => {
      // Arrange
      const productos: Producto[] = [
        {
          id: '1',
          nombre: 'Producto sin cantidad',
          precio: 60,
          imagen: 'imagen.jpg',
          stock: 10,
          cantidad: 0 // cantidad será manejada como undefined por el servicio
        },
        {
          id: '2',
          nombre: 'Producto con cantidad',
          precio: 40,
          cantidad: 2,
          imagen: 'imagen.jpg',
          stock: 5
        }
      ];

      // Simular que el primer producto no tiene cantidad definida
      delete (productos[0] as any).cantidad;

      const expectedTotal = 140; // (60*1) + (40*2) = 60 + 80

      // Act
      service.setItems(productos);
      const total = service.getTotal();

      // Assert
      expect(total).toBe(expectedTotal);
    });

    it('debe calcular correctamente el total con productos de precio 0', () => {
      // Arrange
      const productos: Producto[] = [
        {
          id: '1',
          nombre: 'Producto gratuito',
          precio: 0,
          cantidad: 5,
          imagen: 'imagen.jpg',
          stock: 10
        },
        {
          id: '2',
          nombre: 'Producto normal',
          precio: 50,
          cantidad: 2,
          imagen: 'imagen.jpg',
          stock: 8
        }
      ];
      const expectedTotal = 100; // (0*5) + (50*2) = 0 + 100

      // Act
      service.setItems(productos);
      const total = service.getTotal();

      // Assert
      expect(total).toBe(expectedTotal);
    });

    it('debe calcular correctamente el total después de agregar productos usando addItem', () => {
      // Arrange
      const producto1: Producto = {
        id: '1',
        nombre: 'Producto 1',
        precio: 30,
        imagen: 'imagen.jpg',
        stock: 10,
        cantidad: 1
      };
      const producto2: Producto = {
        id: '2',
        nombre: 'Producto 2',
        precio: 20,
        imagen: 'imagen.jpg',
        stock: 5,
        cantidad: 1
      };
      const expectedTotal = 50; // 30 + 20

      // Act
      service.addItem(producto1);
      service.addItem(producto2);
      const total = service.getTotal();

      // Assert
      expect(total).toBe(expectedTotal);
    });

    it('debe calcular correctamente el total cuando se agrega el mismo producto múltiples veces', () => {
      // Arrange
      const producto: Producto = {
        id: '1',
        nombre: 'Producto repetido',
        precio: 25,
        imagen: 'imagen.jpg',
        stock: 10,
        cantidad: 1
      };
      const expectedTotal = 75; // 25 * 3 (agregado 3 veces)

      // Act
      service.addItem(producto);
      service.addItem(producto);
      service.addItem(producto);
      const total = service.getTotal();

      // Assert
      expect(total).toBe(expectedTotal);
    });

    it('debe manejar correctamente números decimales en precios', () => {
      // Arrange
      const productos: Producto[] = [
        {
          id: '1',
          nombre: 'Producto decimal',
          precio: 15.99,
          cantidad: 2,
          imagen: 'imagen.jpg',
          stock: 10
        },
        {
          id: '2',
          nombre: 'Producto decimal 2',
          precio: 7.50,
          cantidad: 3,
          imagen: 'imagen.jpg',
          stock: 5
        }
      ];
      const expectedTotal = 54.48; // (15.99*2) + (7.50*3) = 31.98 + 22.50

      // Act
      service.setItems(productos);
      const total = service.getTotal();

      // Assert
      expect(total).toBeCloseTo(expectedTotal, 2);
    });
  });
});
