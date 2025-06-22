import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContadorPage } from './contador.page';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { AlertController } from '@ionic/angular';
import { EstadoPago, EstadoPedido, Pedido } from 'src/app/models/bd.models';
import { of } from 'rxjs';

describe('ContadorPage', () => {
  let component: ContadorPage;
  let fixture: ComponentFixture<ContadorPage>;
  let firebaseServiceSpy: jasmine.SpyObj<FirebaseService>;
  let utilsServiceSpy: jasmine.SpyObj<UtilsService>;
  let alertControllerSpy: jasmine.SpyObj<AlertController>;

  const pedidosPrueba: Pedido[] = [
    {
      id: '1',
      productos: [{ id: '1', nombre: 'Prod 1', precio: 1000, stock: 10, imagen: '', cantidad: 2 }],
      ordenCompra: 'ORD001',
      metodoPago: 'transferencia',
      direccion: 'Calle 1',
      retiro: 'domicilio',
      fecha: '2024-01-15',
      estadoPago: EstadoPago.PAGADO,
      estadoPedido: EstadoPedido.ENTREGADO,
      montoTotal: 2000,
      verificadoPorContador: true
    },
    {
      id: '2',
      productos: [{ id: '2', nombre: 'Prod 2', precio: 1500, stock: 5, imagen: '', cantidad: 1 }],
      ordenCompra: 'ORD002',
      metodoPago: 'webpay',
      direccion: 'Calle 2',
      retiro: 'retiro',
      fecha: '2024-01-16',
      estadoPago: EstadoPago.PAGADO,
      estadoPedido: EstadoPedido.ENTREGADO,
      montoTotal: 1500,
      verificadoPorContador: true
    },
    {
      id: '3',
      productos: [{ id: '3', nombre: 'Prod 3', precio: 800, stock: 15, imagen: '', cantidad: 3 }],
      ordenCompra: 'ORD003',
      metodoPago: 'transferencia',
      direccion: 'Calle 3',
      retiro: 'domicilio',
      fecha: '2024-01-17',
      estadoPago: EstadoPago.PAGADO,
      estadoPedido: EstadoPedido.ENTREGADO,
      montoTotal: 2400,
      verificadoPorContador: false
    }
  ];

  const pedidosPendientesTransferencia: Pedido[] = [
    {
      id: '4',
      productos: [{ id: '4', nombre: 'Prod 4', precio: 1200, stock: 3, imagen: '', cantidad: 1 }],
      ordenCompra: 'ORD004',
      metodoPago: 'transferencia',
      direccion: 'Calle Nueva',
      retiro: 'retiro',
      fecha: '2024-01-18',
      estadoPago: EstadoPago.PENDIENTE,
      estadoPedido: EstadoPedido.PENDIENTE,
      verificadoPorContador: false
    }
  ];

  beforeEach(async () => {
    const firebaseSpy = jasmine.createSpyObj('FirebaseService', [
      'getPedidosPorTransferenciaPendientes',
      'getPedidosEntregados',
      'actualizarEstadoPago',
      'actualizarMontoTotalPedido',
      'marcarPedidoVerificado',
      'notificarPagoConfirmadoAlVendedor'
    ]);

    const utilsSpy = jasmine.createSpyObj('UtilsService', ['loading', 'presentToast']);
    const alertSpy = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      declarations: [ContadorPage],
      providers: [
        { provide: FirebaseService, useValue: firebaseSpy },
        { provide: UtilsService, useValue: utilsSpy },
        { provide: AlertController, useValue: alertSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContadorPage);
    component = fixture.componentInstance;
    firebaseServiceSpy = TestBed.inject(FirebaseService) as jasmine.SpyObj<FirebaseService>;
    utilsServiceSpy = TestBed.inject(UtilsService) as jasmine.SpyObj<UtilsService>;
    alertControllerSpy = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;

    firebaseServiceSpy.getPedidosPorTransferenciaPendientes.and.returnValue(of(pedidosPendientesTransferencia));
    firebaseServiceSpy.getPedidosEntregados.and.returnValue(of(pedidosPrueba));
  });

  describe('✅ C032: Pagos por transferencia', () => {
    it('✅ Debería filtrar correctamente los pagos por transferencia pendientes', () => {
      component.cargarDatos();
      expect(firebaseServiceSpy.getPedidosPorTransferenciaPendientes).toHaveBeenCalled();
      expect(component.pedidosPendientesPago.length).toBe(1);
      expect(component.pedidosPendientesPago[0].metodoPago).toBe('transferencia');
    });
  });

  describe('✅ C033: Cálculo de ganancias', () => {
    it('✅ Debería calcular correctamente las ganancias', () => {
      component.calcularEstadisticas(pedidosPrueba);
      expect(component.totalPedidosEntregados).toBe(3);
      expect(component.totalIngresos).toBe(5900);
      expect(component.ingresosPorTransferencia).toBe(4400);
      expect(component.ingresosPorWebpay).toBe(1500);
    });
  });

  describe('✅ C035: Verificación por contador', () => {
    it('✅ Debería marcar como verificado al confirmar pago', async () => {
      const mockAlert = {
        present: jasmine.createSpy('present'),
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Confirmar Pago',
            handler: async () => {
              await firebaseServiceSpy.actualizarEstadoPago('4', EstadoPago.PAGADO);
              await firebaseServiceSpy.marcarPedidoVerificado('4', true);
              return true;
            }
          }
        ]
      };

      const mockLoading = {
        present: () => Promise.resolve(),
        dismiss: () => Promise.resolve()
      };

      alertControllerSpy.create.and.returnValue(Promise.resolve(mockAlert as any));
      utilsServiceSpy.loading.and.returnValue(Promise.resolve(mockLoading as any));
      firebaseServiceSpy.actualizarEstadoPago.and.returnValue(Promise.resolve());
      firebaseServiceSpy.marcarPedidoVerificado.and.returnValue(Promise.resolve());
      firebaseServiceSpy.actualizarMontoTotalPedido.and.returnValue(Promise.resolve());
      firebaseServiceSpy.notificarPagoConfirmadoAlVendedor.and.returnValue(Promise.resolve());

      const pedido = pedidosPendientesTransferencia[0];
      await component.confirmarPagoTransferencia(pedido);

      const alertConfig = alertControllerSpy.create.calls.mostRecent().args[0];
      const confirmarBtn = (alertConfig.buttons as Array<string | { text: string; handler?: () => void }>)
        .find((b): b is { text: string; handler?: () => void } => typeof b !== 'string' && b.text === 'Confirmar Pago');

      if (confirmarBtn?.handler) {
        await confirmarBtn.handler();
      }

      expect(firebaseServiceSpy.actualizarEstadoPago).toHaveBeenCalledWith('4', EstadoPago.PAGADO);
      expect(firebaseServiceSpy.marcarPedidoVerificado).toHaveBeenCalledWith('4', true);
    });
  });
});
