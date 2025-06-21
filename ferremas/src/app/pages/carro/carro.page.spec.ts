// carro.page.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarroPage } from './carro.page';
import { CarritoService } from 'src/app/servicios/carrito.service';
import { UtilsService } from 'src/app/servicios/utils.service';
import { Router } from '@angular/router';
import { FirebaseService } from 'src/app/servicios/firebase.service';
import { TransbankService } from 'src/app/servicios/transbank.service';
import { AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/servicios/auth.service';
import { Producto, EstadoPago, EstadoPedido } from 'src/app/models/bd.models';
import { of } from 'rxjs';

describe('CarroPage - C005: Validar dirección antes de compra', () => {
  let component: CarroPage;
  let fixture: ComponentFixture<CarroPage>;
  let mockCarritoService: jasmine.SpyObj<CarritoService>;
  let mockUtilsService: jasmine.SpyObj<UtilsService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockFirebaseService: jasmine.SpyObj<FirebaseService>;
  let mockTransbankService: jasmine.SpyObj<TransbankService>;
  let mockAlertController: jasmine.SpyObj<AlertController>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockProductos: Producto[] = [
    { id: '1', nombre: 'Producto Test 1', precio: 1000, stock: 5, cantidad: 2, imagen: 'test1.jpg' },
    { id: '2', nombre: 'Producto Test 2', precio: 2000, stock: 3, cantidad: 1, imagen: 'test2.jpg' }
  ];

  const mockDocumentReference = {
    id: 'mock-doc-id',
    path: 'mock/path',
    parent: {} as any,
    firestore: {} as any
  } as any;

  beforeEach(async () => {
    const carritoSpy = jasmine.createSpyObj('CarritoService', ['getItems', 'getTotal', 'removeItem', 'clearCart', 'addItem']);
    const utilsSpy = jasmine.createSpyObj('UtilsService', ['presentModal', 'presentToast', 'loading']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const firebaseSpy = jasmine.createSpyObj('FirebaseService', ['notificarPagoPendienteAContador', 'guardarCompra', 'obtenerTransaccionPorOrden', 'getSucursales']);
    const transbankSpy = jasmine.createSpyObj('TransbankService', ['procesarPago', 'generarOrdenCompra']);
    const alertSpy = jasmine.createSpyObj('AlertController', ['create']);
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    const mockLoading = jasmine.createSpyObj('LoadingElement', ['present', 'dismiss']);
    utilsSpy.loading.and.returnValue(Promise.resolve(mockLoading));
    const mockAlert = jasmine.createSpyObj('AlertElement', ['present']);
    alertSpy.create.and.returnValue(Promise.resolve(mockAlert));

    firebaseSpy.notificarPagoPendienteAContador.and.returnValue(Promise.resolve(mockDocumentReference));
    firebaseSpy.guardarCompra.and.returnValue(Promise.resolve(mockDocumentReference));
    firebaseSpy.getSucursales.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [CarroPage],
      providers: [
        { provide: CarritoService, useValue: carritoSpy },
        { provide: UtilsService, useValue: utilsSpy },
        { provide: Router, useValue: routerSpy },
        { provide: FirebaseService, useValue: firebaseSpy },
        { provide: TransbankService, useValue: transbankSpy },
        { provide: AlertController, useValue: alertSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CarroPage);
    component = fixture.componentInstance;

    mockCarritoService = TestBed.inject(CarritoService) as jasmine.SpyObj<CarritoService>;
    mockUtilsService = TestBed.inject(UtilsService) as jasmine.SpyObj<UtilsService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockFirebaseService = TestBed.inject(FirebaseService) as jasmine.SpyObj<FirebaseService>;
    mockTransbankService = TestBed.inject(TransbankService) as jasmine.SpyObj<TransbankService>;
    mockAlertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    mockCarritoService.getItems.and.returnValue(mockProductos);
    mockCarritoService.getTotal.and.returnValue(4000);

    fixture.detectChanges();
  });

  describe('C005: Validación cuando MetodoRetiroModal retorna datos incompletos', () => {
    it('Debe impedir la compra si no se ingresan datos desde el modal', async () => {
      // Caso 1: sin dirección
      mockUtilsService.presentModal.and.returnValue(Promise.resolve(null));
      const spyElegirMetodoPago = spyOn(component, 'elegirMetodoPago');

      await component.finalizarCompra();

      expect(mockUtilsService.presentModal).toHaveBeenCalled();
      expect(spyElegirMetodoPago).not.toHaveBeenCalled();

      // Caso 2: sin sucursal (nuevo intento)
      mockUtilsService.presentModal.calls.reset();
      spyElegirMetodoPago.calls.reset();

      mockUtilsService.presentModal.and.returnValue(Promise.resolve(null));

      await component.finalizarCompra();

      expect(mockUtilsService.presentModal).toHaveBeenCalled();
      expect(spyElegirMetodoPago).not.toHaveBeenCalled();
    });
  });
});
