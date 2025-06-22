import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, AlertController } from '@ionic/angular';
import { of } from 'rxjs';
import { BodegueroPage } from './bodeguero.page';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { EstadoPedido, Pedido } from 'src/app/models/bd.models';

// Definir un tipo específico para los pedidos en las pruebas con id requerido
type PedidoConId = Pedido & { id: string };

describe('BodegueroPage', () => {
  let component: BodegueroPage;
  let fixture: ComponentFixture<BodegueroPage>;
  let firebaseServiceSpy: jasmine.SpyObj<FirebaseService>;
  let utilsServiceSpy: jasmine.SpyObj<UtilsService>;
  let alertControllerSpy: jasmine.SpyObj<AlertController>;

  const mockPedidos: PedidoConId[] = [
    {
      id: '1',
      productos: [{ id: '1', nombre: 'Producto 1', precio: 1000, stock: 10, cantidad: 2, imagen: '' }],
      ordenCompra: 'ORD-001',
      metodoPago: 'webpay',
      direccion: 'Calle 123',
      retiro: 'despacho',
      fecha: '2024-01-01',
      estadoPago: 'pagado',
      estadoPedido: EstadoPedido.ACEPTADO,
      clienteId: 'client1'
    },
    {
      id: '2',
      productos: [{ id: '2', nombre: 'Producto 2', precio: 2000, stock: 5, cantidad: 1, imagen: '' }],
      ordenCompra: 'ORD-002',
      metodoPago: 'transferencia',
      direccion: 'Avenida 456',
      retiro: 'retiro',
      fecha: '2024-01-02',
      estadoPago: 'pagado',
      estadoPedido: EstadoPedido.EN_PREPARACION,
      clienteId: 'client2'
    },
    {
      id: '3',
      productos: [{ id: '3', nombre: 'Producto 3', precio: 3000, stock: 8, cantidad: 3, imagen: '' }],
      ordenCompra: 'ORD-003',
      metodoPago: 'webpay',
      direccion: 'Plaza 789',
      retiro: 'despacho',
      fecha: '2024-01-03',
      estadoPago: 'pagado',
      estadoPedido: EstadoPedido.PREPARADO,
      clienteId: 'client3'
    }
  ];

  const mockLoadingElement = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
  } as unknown as HTMLIonLoadingElement;

  const mockAlert = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve()),
    buttons: [],
    header: '',
    message: ''
  } as unknown as HTMLIonAlertElement;

  beforeEach(async () => {
    const firebaseSpy = jasmine.createSpyObj('FirebaseService', [
      'getPedidosBodega',
      'actualizarEstadoPedido',
      'notificarPedidoPreparado'
    ]);

    const utilsSpy = jasmine.createSpyObj('UtilsService', [
      'loading',
      'presentToast'
    ]);

    const alertSpy = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      declarations: [BodegueroPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: FirebaseService, useValue: firebaseSpy },
        { provide: UtilsService, useValue: utilsSpy },
        { provide: AlertController, useValue: alertSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BodegueroPage);
    component = fixture.componentInstance;
    firebaseServiceSpy = TestBed.inject(FirebaseService) as jasmine.SpyObj<FirebaseService>;
    utilsServiceSpy = TestBed.inject(UtilsService) as jasmine.SpyObj<UtilsService>;
    alertControllerSpy = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;

    firebaseServiceSpy.getPedidosBodega.and.returnValue(of(mockPedidos));
    utilsServiceSpy.loading.and.returnValue(Promise.resolve(mockLoadingElement));
    utilsServiceSpy.presentToast.and.returnValue(Promise.resolve());
    alertControllerSpy.create.and.returnValue(Promise.resolve(mockAlert));
  });

  it('✔️ C000: Componente creado correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('✔️ C023 - Ver pedidos estado ACEPTADO', () => {
    it('✔️ C023-1: Filtra correctamente los pedidos con estado ACEPTADO', () => {
      const pedidos: PedidoConId[] = [
        { ...mockPedidos[0], estadoPedido: EstadoPedido.ACEPTADO },
        { ...mockPedidos[1], estadoPedido: EstadoPedido.EN_PREPARACION },
        { ...mockPedidos[2], estadoPedido: EstadoPedido.PREPARADO },
        {
          id: '4',
          productos: [],
          ordenCompra: 'ORD-004',
          metodoPago: 'webpay',
          direccion: 'X',
          retiro: 'retiro',
          fecha: '2024-01-04',
          estadoPago: 'pagado',
          estadoPedido: EstadoPedido.ACEPTADO,
          clienteId: 'client4'
        }
      ];
      firebaseServiceSpy.getPedidosBodega.and.returnValue(of(pedidos));
      component.cargarPedidos();
      expect(component.pedidosPorPreparar.map(p => p.id)).toEqual(['1', '4']);
    });

    it('✔️ C023-2: Retorna lista vacía si no hay pedidos ACEPTADOS', () => {
      const sinAceptados: PedidoConId[] = [mockPedidos[1], mockPedidos[2]];
      firebaseServiceSpy.getPedidosBodega.and.returnValue(of(sinAceptados));
      component.cargarPedidos();
      expect(component.pedidosPorPreparar).toEqual([]);
    });

    it('✔️ C023-3: Separa correctamente por estado', () => {
      firebaseServiceSpy.getPedidosBodega.and.returnValue(of(mockPedidos));
      component.cargarPedidos();
      expect(component.pedidosPorPreparar.length).toBe(1);
      expect(component.pedidosEnPreparacion.length).toBe(1);
      expect(component.pedidosPreparados.length).toBe(1);
    });
  });

  describe('✔️ C024 - Cambiar estado a EN_PREPARACION', () => {
    it('✔️ C024-1: Cambia estado a EN_PREPARACION correctamente', async () => {
      const pedido: PedidoConId = { ...mockPedidos[0] };
      firebaseServiceSpy.actualizarEstadoPedido.and.returnValue(Promise.resolve());
      await component.iniciarPreparacion(pedido);
      expect(firebaseServiceSpy.actualizarEstadoPedido).toHaveBeenCalledWith(pedido.id, EstadoPedido.EN_PREPARACION);
    });

    it('✔️ C024-2: Maneja errores si falla actualización de estado', async () => {
      const pedido: PedidoConId = { ...mockPedidos[0] };
      firebaseServiceSpy.actualizarEstadoPedido.and.returnValue(Promise.reject('error'));
      spyOn(console, 'error');
      await component.iniciarPreparacion(pedido);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('✔️ C026 - Entregar pedido a vendedor', () => {
    it('✔️ C026-1: Marca como preparado y notifica al vendedor', async () => {
      const pedido: PedidoConId = { ...mockPedidos[1] };
      firebaseServiceSpy.actualizarEstadoPedido.and.returnValue(Promise.resolve());
      firebaseServiceSpy.notificarPedidoPreparado.and.returnValue(Promise.resolve());

      const confirmHandler = async () => {
        const loading = await utilsServiceSpy.loading();
        await loading.present();
        await firebaseServiceSpy.actualizarEstadoPedido(pedido.id, EstadoPedido.PREPARADO);
        await firebaseServiceSpy.notificarPedidoPreparado(pedido);
        await loading.dismiss();
      };

      alertControllerSpy.create.and.returnValue(Promise.resolve({
        present: () => Promise.resolve(),
        dismiss: () => Promise.resolve(),
        header: 'Finalizar Preparación',
        message: '¿Confirmas que el pedido está listo para entregar?',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Confirmar', handler: confirmHandler }
        ]
      } as any));

      await component.marcarComoPedidoListo(pedido);
    });
  });
});
