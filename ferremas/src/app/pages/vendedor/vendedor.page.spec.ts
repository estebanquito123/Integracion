import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VendedorPage } from './vendedor.page';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { AlertController } from '@ionic/angular';
import { EstadoPedido, Pedido, EstadoPago } from 'src/app/models/bd.models';
import { of } from 'rxjs';

describe('VendedorPage', () => {
  let component: VendedorPage;
  let fixture: ComponentFixture<VendedorPage>;
  let firebaseServiceSpy: jasmine.SpyObj<FirebaseService>;
  let utilsServiceSpy: jasmine.SpyObj<UtilsService>;
  let alertControllerSpy: jasmine.SpyObj<AlertController>;

  // Mock de datos para las pruebas
  const mockPedidos: Pedido[] = [
    {
      id: '1',
      productos: [
        {
          id: '1',
          imagen: 'imagen1.jpg',
          nombre: 'Producto 1',
          precio: 100,
          stock: 10,
          cantidad: 2
        }
      ],
      ordenCompra: 'OC001',
      metodoPago: 'webpay',
      direccion: 'Dirección 1',
      retiro: 'retiro',
      fecha: '2025-06-22',
      estadoPago: EstadoPago.PAGADO,
      estadoPedido: EstadoPedido.PENDIENTE,
      clienteId: 'cliente1',
      montoTotal: 200
    } as Pedido,
    {
      id: '2',
      productos: [
        {
          id: '2',
          imagen: 'imagen2.jpg',
          nombre: 'Producto 2',
          precio: 150,
          stock: 5,
          cantidad: 1
        }
      ],
      ordenCompra: 'OC002',
      metodoPago: 'transferencia',
      direccion: 'Dirección 2',
      retiro: 'despacho',
      fecha: '2025-06-22',
      estadoPago: EstadoPago.PAGADO,
      estadoPedido: EstadoPedido.ACEPTADO,
      clienteId: 'cliente2',
      montoTotal: 150
    } as Pedido,
    {
      id: '3',
      productos: [
        {
          id: '3',
          imagen: 'imagen3.jpg',
          nombre: 'Producto 3',
          precio: 300,
          stock: 3,
          cantidad: 1
        }
      ],
      ordenCompra: 'OC003',
      metodoPago: 'webpay',
      direccion: 'Dirección 3',
      retiro: 'retiro',
      fecha: '2025-06-22',
      estadoPago: EstadoPago.PAGADO,
      estadoPedido: EstadoPedido.RECHAZADO,
      clienteId: 'cliente3',
      montoTotal: 300
    } as Pedido
  ];

  beforeEach(async () => {
    // Crear spies para los servicios
    const firebaseSpy = jasmine.createSpyObj('FirebaseService', [
      'getPedidosPorEstado',
      'actualizarEstadoPedido',
      'notificarPedidoABodeguero'
    ]);
    const utilsSpy = jasmine.createSpyObj('UtilsService', [
      'loading',
      'presentToast'
    ]);
    const alertSpy = jasmine.createSpyObj('AlertController', ['create']);

    // Configurar respuestas por defecto de los mocks
    firebaseSpy.getPedidosPorEstado.and.returnValue(of(mockPedidos) as any);

    const mockLoading = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
    };
    utilsSpy.loading.and.returnValue(Promise.resolve(mockLoading));
    utilsSpy.presentToast.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      declarations: [VendedorPage],
      providers: [
        { provide: FirebaseService, useValue: firebaseSpy },
        { provide: UtilsService, useValue: utilsSpy },
        { provide: AlertController, useValue: alertSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VendedorPage);
    component = fixture.componentInstance;
    firebaseServiceSpy = TestBed.inject(FirebaseService) as jasmine.SpyObj<FirebaseService>;
    utilsServiceSpy = TestBed.inject(UtilsService) as jasmine.SpyObj<UtilsService>;
    alertControllerSpy = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
  });

  // C013: Filtrar pedidos por estado "pendiente"
  describe('C013: Filtrar pedidos por estado "pendiente"', () => {
    it('debería mostrar correctamente solo los pedidos pendientes', () => {
      // Arrange
      const expectedPedidosPendientes = mockPedidos.filter(p => p.estadoPedido === EstadoPedido.PENDIENTE);

      // Act
      component.ngOnInit();

      // Assert
      expect(firebaseServiceSpy.getPedidosPorEstado).toHaveBeenCalled();
      expect(component.pedidosPendientes).toEqual(expectedPedidosPendientes);
      expect(component.pedidosPendientes.length).toBe(1);
      expect(component.pedidosPendientes[0].estadoPedido).toBe(EstadoPedido.PENDIENTE);
      expect(component.pedidosPendientes[0].id).toBe('1');
      expect(component.pedidosPendientes[0].ordenCompra).toBe('OC001');
    });

    it('debería filtrar correctamente cuando no hay pedidos pendientes', () => {
      // Arrange
      const mockPedidosSinPendientes = mockPedidos.filter(p => p.estadoPedido !== EstadoPedido.PENDIENTE);
      firebaseServiceSpy.getPedidosPorEstado.and.returnValue(of(mockPedidosSinPendientes) as any);

      // Act
      component.cargarPedidos();

      // Assert
      expect(component.pedidosPendientes).toEqual([]);
      expect(component.pedidosPendientes.length).toBe(0);
    });

    it('debería actualizar la lista de pedidos pendientes cuando se llama cargarPedidos()', () => {
      // Arrange
      const nuevosPedidosPendientes: Pedido[] = [
        {
          id: '4',
          productos: [{ id: '4', imagen: 'img4.jpg', nombre: 'Producto 4', precio: 400, stock: 2, cantidad: 1 }],
          ordenCompra: 'OC004',
          metodoPago: 'webpay',
          direccion: 'Nueva dirección',
          retiro: 'retiro',
          fecha: '2025-06-23',
          estadoPago: EstadoPago.PAGADO,
          estadoPedido: EstadoPedido.PENDIENTE,
          clienteId: 'cliente4',
          montoTotal: 400
        } as Pedido
      ];
      firebaseServiceSpy.getPedidosPorEstado.and.returnValue(of(nuevosPedidosPendientes) as any);

      // Act
      component.cargarPedidos();

      // Assert
      expect(component.pedidosPendientes).toEqual(nuevosPedidosPendientes);
      expect(component.pedidosPendientes.length).toBe(1);
      expect(component.pedidosPendientes[0].ordenCompra).toBe('OC004');
    });
  });

  // C017: Notificar a bodeguero tras aprobación
  describe('C017: Notificar a bodeguero tras aprobación', () => {
    let mockLoadingController: any;

    beforeEach(() => {
      mockLoadingController = {
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
        dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
      };
      utilsServiceSpy.loading.and.returnValue(Promise.resolve(mockLoadingController));

      // Mock successful responses
      firebaseServiceSpy.actualizarEstadoPedido.and.returnValue(Promise.resolve());
      firebaseServiceSpy.notificarPedidoABodeguero.and.returnValue(Promise.resolve());
    });

    it('debería verificar que se llama al método de notificación al aprobar un pedido', async () => {
      // Arrange
      const pedidoParaAprobar = mockPedidos[0]; // Pedido pendiente

      // Act
      await component.aceptarPedido(pedidoParaAprobar);

      // Assert
      expect(firebaseServiceSpy.notificarPedidoABodeguero).toHaveBeenCalledWith(pedidoParaAprobar);
      expect(firebaseServiceSpy.notificarPedidoABodeguero).toHaveBeenCalledTimes(1);
    });

    it('debería actualizar el estado del pedido antes de notificar al bodeguero', async () => {
      // Arrange
      const pedidoParaAprobar = mockPedidos[0];

      // Act
      await component.aceptarPedido(pedidoParaAprobar);

      // Assert
      expect(firebaseServiceSpy.actualizarEstadoPedido).toHaveBeenCalledWith(
        pedidoParaAprobar.id,
        EstadoPedido.ACEPTADO
      );
      expect(firebaseServiceSpy.actualizarEstadoPedido).toHaveBeenCalledBefore(
        firebaseServiceSpy.notificarPedidoABodeguero
      );
    });

    it('debería mostrar loading durante el proceso de aprobación', async () => {
      // Arrange
      const pedidoParaAprobar = mockPedidos[0];

      // Act
      await component.aceptarPedido(pedidoParaAprobar);

      // Assert
      expect(utilsServiceSpy.loading).toHaveBeenCalled();
      expect(mockLoadingController.present).toHaveBeenCalled();
      expect(mockLoadingController.dismiss).toHaveBeenCalled();
    });

    it('debería mostrar toast de éxito después de aprobar y notificar correctamente', async () => {
      // Arrange
      const pedidoParaAprobar = mockPedidos[0];

      // Act
      await component.aceptarPedido(pedidoParaAprobar);

      // Assert
      expect(utilsServiceSpy.presentToast).toHaveBeenCalledWith({
        message: 'Pedido aceptado y enviado a bodega',
        duration: 2000,
        color: 'success'
      });
    });

    it('debería manejar errores y no notificar al bodeguero si falla la actualización del estado', async () => {
      // Arrange
      const pedidoParaAprobar = mockPedidos[0];
      const errorMock = new Error('Error al actualizar estado');
      firebaseServiceSpy.actualizarEstadoPedido.and.returnValue(Promise.reject(errorMock));

      // Act
      await component.aceptarPedido(pedidoParaAprobar);

      // Assert
      expect(firebaseServiceSpy.actualizarEstadoPedido).toHaveBeenCalled();
      expect(firebaseServiceSpy.notificarPedidoABodeguero).not.toHaveBeenCalled();
      expect(utilsServiceSpy.presentToast).toHaveBeenCalledWith({
        message: 'Error al procesar el pedido',
        duration: 2000,
        color: 'danger'
      });
    });

    it('debería manejar errores en la notificación y mostrar mensaje de error', async () => {
      // Arrange
      const pedidoParaAprobar = mockPedidos[0];
      const errorMock = new Error('Error en notificación');
      firebaseServiceSpy.notificarPedidoABodeguero.and.returnValue(Promise.reject(errorMock));

      // Act
      await component.aceptarPedido(pedidoParaAprobar);

      // Assert
      expect(firebaseServiceSpy.actualizarEstadoPedido).toHaveBeenCalled();
      expect(firebaseServiceSpy.notificarPedidoABodeguero).toHaveBeenCalled();
      expect(utilsServiceSpy.presentToast).toHaveBeenCalledWith({
        message: 'Error al procesar el pedido',
        duration: 2000,
        color: 'danger'
      });
      expect(mockLoadingController.dismiss).toHaveBeenCalled();
    });

    it('debería llamar a la notificación con el pedido correcto incluyendo todos los datos necesarios', async () => {
      // Arrange
      const pedidoCompleto: Pedido = {
        id: 'test-id',
        productos: [
          { id: 'prod1', imagen: 'img1.jpg', nombre: 'Producto Test', precio: 500, stock: 10, cantidad: 2 }
        ],
        ordenCompra: 'OC-TEST-001',
        metodoPago: 'webpay',
        direccion: 'Dirección de prueba',
        retiro: 'despacho',
        fecha: '2025-06-22',
        estadoPago: EstadoPago.PAGADO,
        estadoPedido: EstadoPedido.PENDIENTE,
        clienteId: 'cliente-test',
        montoTotal: 1000
      } as Pedido;

      // Act
      await component.aceptarPedido(pedidoCompleto);

      // Assert
      expect(firebaseServiceSpy.notificarPedidoABodeguero).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: 'test-id',
          ordenCompra: 'OC-TEST-001',
          clienteId: 'cliente-test',
          productos: jasmine.any(Array),
          montoTotal: 1000
        })
      );
    });
  });

  // Pruebas adicionales de setup y configuración
  describe('Configuración del componente', () => {
    it('debería crear el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería tener el segmento inicial como "pendientes"', () => {
      expect(component.segmento).toBe('pendientes');
    });

    it('debería inicializar las listas de pedidos como arrays vacíos', () => {
      // Reset component to initial state
      component.pedidosPendientes = [];
      component.pedidosAceptados = [];
      component.pedidosListoDespacho = [];
      component.pedidosRechazados = [];

      expect(component.pedidosPendientes).toEqual([]);
      expect(component.pedidosAceptados).toEqual([]);
      expect(component.pedidosListoDespacho).toEqual([]);
      expect(component.pedidosRechazados).toEqual([]);
    });

    it('debería llamar a cargarPedidos en ngOnInit', () => {
      // Arrange
      spyOn(component, 'cargarPedidos');

      // Act
      component.ngOnInit();

      // Assert
      expect(component.cargarPedidos).toHaveBeenCalled();
    });

    it('debería llamar a cargarPedidos en ionViewWillEnter', () => {
      // Arrange
      spyOn(component, 'cargarPedidos');

      // Act
      component.ionViewWillEnter();

      // Assert
      expect(component.cargarPedidos).toHaveBeenCalled();
    });
  });
});
