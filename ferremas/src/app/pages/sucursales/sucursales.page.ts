// sucursales.page.ts
import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { SucursalesService } from 'src/app/servicios/sucursales.service';
import { Sucursal } from 'src/app/models/bd.models';
import { Subscription } from 'rxjs';

declare var google: any;

@Component({
  selector: 'app-sucursales',
  templateUrl: './sucursales.page.html',
  styleUrls: ['./sucursales.page.scss'],
})
export class SucursalesPage implements OnInit {
  @ViewChild('map', { static: false }) mapElement: ElementRef;
  map: any;
  marker: any;
  geocoder: any;
  sucursales: Sucursal[] = [];
  sucursalForm: FormGroup;
  isEditMode = false;
  currentSucursalId = '';
  subscription: Subscription;

  constructor(
    private fb: FormBuilder,
    private sucursalesService: SucursalesService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private ngZone: NgZone
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadSucursales();
  }

  ionViewDidEnter() {
    this.loadMap();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private initForm() {
    this.sucursalForm = this.fb.group({
      nombre: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      horario: ['', [Validators.required]],
      ubicacion: this.fb.group({
        lat: [null, [Validators.required]],
        lng: [null, [Validators.required]]
      }),
      activo: [true]
    });
  }

  loadSucursales() {
    this.subscription = this.sucursalesService.getSucursales().subscribe(data => {
      this.sucursales = data;
    });
  }

  async loadMap() {
    try {
      // Esperar hasta que el elemento del mapa esté disponible en el DOM
      await this.waitForElement();

      const options = {
        center: { lat: -33.4489, lng: -70.6693 }, // Santiago de Chile por defecto
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };

      this.map = new google.maps.Map(this.mapElement.nativeElement, options);
      this.geocoder = new google.maps.Geocoder();

      // Permitir al usuario seleccionar ubicación con un clic
      this.map.addListener('click', (event) => {
        this.placeMarker(event.latLng);
        this.updateFormLocation(event.latLng.lat(), event.latLng.lng());
      });
    } catch (error) {
      console.error('Error loading map:', error);
    }
  }

  // Función para esperar hasta que el elemento del mapa esté en el DOM
  private waitForElement(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.mapElement && this.mapElement.nativeElement) {
        resolve();
      } else {
        setTimeout(() => this.waitForElement().then(resolve), 100);
      }
    });
  }

  placeMarker(location) {
    if (this.marker) {
      this.marker.setMap(null);
    }

    this.marker = new google.maps.Marker({
      position: location,
      map: this.map,
      draggable: true
    });

    // Permitir actualizaciones cuando se arrastra el marcador
    this.marker.addListener('dragend', (event) => {
      const position = this.marker.getPosition();
      this.updateFormLocation(position.lat(), position.lng());
    });

    // Centrar el mapa en la ubicación del marcador
    this.map.panTo(location);
  }

  updateFormLocation(lat: number, lng: number) {
    this.ngZone.run(() => {
      this.sucursalForm.get('ubicacion').setValue({
        lat: lat,
        lng: lng
      });

      // Opcional: Reverse geocoding para actualizar la dirección
      this.geocoder.geocode({ 'location': { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          this.sucursalForm.get('direccion').setValue(results[0].formatted_address);
        }
      });
    });
  }

  buscarDireccion() {
    const direccion = this.sucursalForm.get('direccion').value;
    if (!direccion) return;

    this.geocoder.geocode({ 'address': direccion }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;

        this.ngZone.run(() => {
          this.map.setCenter(location);
          this.placeMarker(location);
          this.updateFormLocation(location.lat(), location.lng());
        });
      } else {
        this.presentToast('No se pudo encontrar la dirección');
      }
    });
  }

  async onCreate() {
    if (!this.sucursalForm.valid) {
      this.presentToast('Por favor complete todos los campos');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Guardando...'
    });
    await loading.present();

    try {
      const sucursal = this.sucursalForm.value as Sucursal;
      if (this.isEditMode) {
        await this.sucursalesService.updateSucursal(this.currentSucursalId, sucursal);
        this.presentToast('Sucursal actualizada correctamente');
      } else {
        await this.sucursalesService.createSucursal(sucursal);
        this.presentToast('Sucursal creada correctamente');
      }
      this.resetForm();
    } catch (error) {
      console.error(error);
      this.presentToast('Error al guardar la sucursal');
    } finally {
      loading.dismiss();
    }
  }

  editSucursal(sucursal: Sucursal) {
    this.isEditMode = true;
    this.currentSucursalId = sucursal.id;
    this.sucursalForm.setValue({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
      telefono: sucursal.telefono,
      horario: sucursal.horario,
      ubicacion: {
        lat: sucursal.ubicacion.lat,
        lng: sucursal.ubicacion.lng
      },
      activo: sucursal.activo
    });

    // Actualizar mapa y marcador
    const location = new google.maps.LatLng(
      sucursal.ubicacion.lat,
      sucursal.ubicacion.lng
    );
    this.map.setCenter(location);
    this.placeMarker(location);
  }

  async confirmDelete(sucursal: Sucursal) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar eliminación',
      message: `¿Está seguro que desea eliminar la sucursal ${sucursal.nombre}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: () => {
            this.deleteSucursal(sucursal.id);
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteSucursal(id: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Eliminando...'
    });
    await loading.present();

    try {
      await this.sucursalesService.deleteSucursal(id);
      this.presentToast('Sucursal eliminada correctamente');
    } catch (error) {
      console.error(error);
      this.presentToast('Error al eliminar la sucursal');
    } finally {
      loading.dismiss();
    }
  }

  resetForm() {
    this.isEditMode = false;
    this.currentSucursalId = '';
    this.sucursalForm.reset({
      activo: true,
      ubicacion: {
        lat: null,
        lng: null
      }
    });
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

abrirEnGoogleMaps(sucursal: Sucursal) {
  if (sucursal && sucursal.ubicacion && sucursal.ubicacion.lat && sucursal.ubicacion.lng) {
    // Formatear las coordenadas para la URL de Google Maps
    const coords = `${sucursal.ubicacion.lat},${sucursal.ubicacion.lng}`;

    // Crear la URL de Google Maps incluyendo el nombre de la sucursal para mostrar un pin etiquetado
    const url = `https://www.google.com/maps/search/?api=1&query=${coords}&query_place_id=${encodeURIComponent(sucursal.nombre)}`;

    // Abrir la URL en una nueva pestaña del navegador
    window.open(url, '_blank');
  } else {
    this.presentToast('No se pudo abrir el mapa: coordenadas no disponibles');
  }
}
}
