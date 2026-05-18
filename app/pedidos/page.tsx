"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  Save, 
  Upload, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Truck, 
  Bell,
  Layers,
  ArrowLeft,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Editor ReactQuill (Carga dinámica para Next.js)
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="h-48 w-full bg-slate-800 animate-pulse rounded-xl" />
});
import 'react-quill-new/dist/quill.snow.css';

interface Producto {
  nombre: string;
  precio_unidad: number;
  cantidad: number;
  total: number;
}

interface ImageUpload {
  id: string;
  file?: File;
  progress: number;
  preview: string;
  isExisting?: boolean;
}

const ESTADOS_DISPONIBLES = [
  "Nuevo Cliente",
  "Urge",
  "Empezado",
  "Juan",
  "Imprimir",
  "Envios",
  "DTF",
  "Finalizado",
  "Cotizacion"
];

function PedidoContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<number | null>(null);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isZipping, setIsZipping] = useState(false);

  // FIX: Recuperar la página de origen desde la URL (por defecto vuelve a la 1)
  const returnPage = searchParams.get('returnPage') || '1';
  
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    telefono: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    fecha_entrega: '',
    notificar_entrega: false,
    requiere_envio: false,
    direccion_envio: '',
    notas: '',
    estado: 'Nuevo Cliente', // Estado inicial por defecto
    productos: [{ nombre: '', precio_unidad: 0, cantidad: 1, total: 0 }]
  });

  const [images, setImages] = useState<ImageUpload[]>([]);
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CARGAR PEDIDO SI EXISTE ID EN URL ---
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      cargarPedido(id);
    }
  }, [searchParams]);

  const cargarPedido = async (id: string) => {
    setSavingStatus('saving');
    try {
      const res = await fetch(`/api/pedidos/get?id=${id}`);
      const data = await res.json();
      
      if (data && !data.error) {
        setOrderId(parseInt(id));
        setFormData({
          nombre_cliente: data.nombre_cliente || '',
          telefono: data.telefono || '',
          fecha_solicitud: data.fecha_solicitud || '',
          fecha_entrega: data.fecha_entrega || '',
          notificar_entrega: data.notificar_entrega === 1,
          requiere_envio: data.requiere_envio === 1,
          direccion_envio: data.direccion_envio || '',
          notas: data.notas || '',
          estado: data.estado || 'Nuevo Cliente', // Mapeo del estado desde la BD
          productos: data.productos.length > 0 ? data.productos : [{ nombre: '', precio_unidad: 0, cantidad: 1, total: 0 }]
        });

        // Mapear imágenes existentes
        if (data.imagenes) {
          const existingImages = data.imagenes.map((img: any) => ({
            id: img.id.toString(),
            preview: img.ruta_imagen,
            progress: 100,
            isExisting: true
          }));
          setImages(existingImages);
        }
        setSavingStatus('saved');
      }
    } catch (e) {
      setSavingStatus('error');
    }
  };

  // --- AUTO-GUARDADO (Debounce) ---
  useEffect(() => {
    if (!formData.nombre_cliente && formData.productos[0].nombre === '') return;
    const timer = setTimeout(() => handleSave(true), 2500);
    return () => clearTimeout(timer);
  }, [formData]);

  const handlePhoneChange = (val: string) => {
    let raw = val.replace(/\D/g, '');
    if (raw.length > 8) raw = raw.slice(0, 8);
    if (raw.length > 4) raw = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    setFormData({ ...formData, telefono: raw });
  };

  const updateProduct = (index: number, field: keyof Producto, value: any) => {
    const newProds = [...formData.productos];
    newProds[index] = { ...newProds[index], [field]: value };
    if (field === 'precio_unidad' || field === 'cantidad') {
      newProds[index].total = Number(newProds[index].precio_unidad) * Number(newProds[index].cantidad);
    }
    setFormData({ ...formData, productos: newProds });
  };

  const addProduct = () => setFormData({
    ...formData, 
    productos: [...formData.productos, { nombre: '', precio_unidad: 0, cantidad: 1, total: 0 }]
  });

  const removeProduct = (idx: number) => {
    //if (formData.productos.length > 1) {
    setFormData({ ...formData, productos: formData.productos.filter((_, i) => i !== idx) });
    //}
  };

  const grandTotal = formData.productos.reduce((sum, p) => sum + p.total, 0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newFiles]);
    newFiles.forEach(img => {
      let p = 0;
      const interval = setInterval(() => {
        p += 20;
        setImages(old => old.map(i => i.id === img.id ? { ...i, progress: p } : i));
        if (p >= 100) clearInterval(interval);
      }, 300);
    });
  };

  const handleSave = async (isAuto = false) => {
    setSavingStatus('saving');
    try {
      const data = new FormData();
      if (orderId) data.append('id', orderId.toString());
      data.append('nombre_cliente', formData.nombre_cliente);
      data.append('telefono', formData.telefono);
      data.append('fecha_solicitud', formData.fecha_solicitud);
      data.append('fecha_entrega', formData.fecha_entrega);
      data.append('notificar_entrega', String(formData.notificar_entrega));
      data.append('requiere_envio', String(formData.requiere_envio));
      data.append('direccion_envio', formData.direccion_envio);
      data.append('notas', formData.notas);
      data.append('estado', formData.estado);
      data.append('grand_total', grandTotal.toString());
      data.append('productos', JSON.stringify(formData.productos));
      
      // Solo enviar archivos nuevos
      images.forEach(img => { 
        if (img.file) data.append('images', img.file); 
      });

      const res = await fetch('/api/pedidos', { method: 'POST', body: data });
      const result = await res.json();
      if (result.success) {
        if (result.id) setOrderId(result.id);
        setSavingStatus('saved');
      } else { setSavingStatus('error'); }
    } catch (e) { setSavingStatus('error'); }
  };

  const handleRemoveImage = async (img: ImageUpload) => {
    if (img.isExisting) {
      // Confirmación para imágenes que ya están en el servidor
      if (!confirm("¿Estás seguro de eliminar esta imagen permanentemente del servidor?")) return;

      try {
        const res = await fetch(`/api/pedidos/delete-image?id=${img.id}`, {
          method: 'DELETE',
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
      } catch (error) {
        alert("Error al eliminar la imagen del servidor");
        return; // No la quitamos de la vista si falló el borrado real
      }
    }

    // Quitar de la vista (aplica para nuevas y existentes borradas con éxito)
    setImages(prev => prev.filter(i => i.id !== img.id));
  };

  const handleDownloadZip = async () => {
    if (images.length === 0) return;
    setIsZipping(true);
    try {
      // Importación dinámica de JSZip al hacer clic
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Descargar cada imagen de forma asíncrona paralela/secuencial limpia
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        try {
          const response = await fetch(img.preview);
          const blob = await response.blob();
          
          // Extraer extensión del archivo o asignar 'jpg' por defecto
          const ext = blob.type.split('/')[1] || 'jpg';
          // Nombrar usando el ID del pedido y un correlativo estructurado
          const filename = `pedido_${orderId || 'nuevo'}_img_${i + 1}.${ext}`;
          
          zip.file(filename, blob);
        } catch (err) {
          console.error(`Error procesando archivo index ${i}:`, err);
        }
      }

      // Generar el archivo ZIP binario
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Crear el disparador de descarga nativo
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Orden_${orderId ? orderId.toString().padStart(5, '0') : 'Nueva'}_Archivos.zip`;
      link.click();
      
      // Liberar memoria del objeto URL
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error al comprimir la galería:", error);
      alert("Hubo un problema al empaquetar las imágenes de la galería.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-10 font-sans text-slate-200">
      <style jsx global>{`
        .ql-container.ql-snow { border-color: #334155 !important; border-bottom-left-radius: 0.75rem; border-bottom-right-radius: 0.75rem; }
        .ql-toolbar.ql-snow { border-color: #334155 !important; background-color: #1e293b !important; border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; }
        .ql-editor { background-color: #0f172a; color: #f1f5f9; min-height: 150px; }
        .ql-snow .ql-stroke { stroke: #cbd5e1 !important; }
        .ql-snow .ql-fill { fill: #cbd5e1 !important; }
        .ql-snow .ql-picker { color: #cbd5e1 !important; }
      `}</style>

      <div className="max-w-6xl mx-auto bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden border border-slate-800">
        
        <div className="bg-slate-950 p-6 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-4">
            {/* FIX: Se añade la query ?page= con la página correcta al botón regresar */}
            <Link href={`/pedidos/listado?page=${returnPage}&highlightId=${orderId}`} className="text-slate-500 hover:text-white transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-black italic tracking-tighter text-blue-500">
              {orderId ? `PEDIDO #${orderId.toString().padStart(5, '0')}` : 'NUEVO PEDIDO'}
            </h1>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
            {savingStatus === 'saving' && <span className="text-amber-500 animate-pulse">Sincronizando...</span>}
            {savingStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={16}/> Protegido</span>}
          </div>
        </div>

        <div className="p-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase absolute -top-2 left-3 bg-slate-900 px-1">Cliente</label>
                <input 
                  type="text" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-lg outline-none focus:border-blue-600 transition-all text-white"
                  value={formData.nombre_cliente} onChange={e => setFormData({...formData, nombre_cliente: e.target.value})}
                />
              </div>
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase absolute -top-2 left-3 bg-slate-900 px-1">Teléfono</label>
                <input 
                  type="text" placeholder="xxxx-xxxx" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-lg outline-none focus:border-blue-600 transition-all text-white"
                  value={formData.telefono} onChange={e => handlePhoneChange(e.target.value)}
                />
              </div>
              {/* Nuevo Campo de Selección de Estado */}
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase absolute -top-2 left-3 bg-slate-900 px-1 flex items-center gap-1">
                  <Layers size={10} /> Estado de Trabajo
                </label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-600 transition-all text-white cursor-pointer"
                  value={formData.estado}
                  onChange={e => setFormData({...formData, estado: e.target.value})}
                >
                  {ESTADOS_DISPONIBLES.map(est => (
                    <option key={est} value={est} className="bg-slate-900 text-slate-200 font-bold">{est}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Fecha Solicitud</span>
                  <input type="date" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-white" value={formData.fecha_solicitud} onChange={e => setFormData({...formData, fecha_solicitud: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Fecha Entrega</span>
                  <input type="date" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-white" value={formData.fecha_entrega} onChange={e => setFormData({...formData, fecha_entrega: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 space-y-5">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={formData.notificar_entrega} onChange={e => setFormData({...formData, notificar_entrega: e.target.checked})} />
                <span className="font-bold text-slate-300 group-hover:text-white transition-colors flex items-center gap-2"><Bell size={18}/> Notificar Entrega</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={formData.requiere_envio} onChange={e => setFormData({...formData, requiere_envio: e.target.checked})} />
                <span className="font-bold text-slate-300 group-hover:text-white transition-colors flex items-center gap-2"><Truck size={18}/> Requiere Envío</span>
              </label>
              {formData.requiere_envio && (
                <textarea 
                  placeholder="Dirección exacta..." className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl min-h-[100px] outline-none text-white focus:border-blue-600"
                  value={formData.direccion_envio} onChange={e => setFormData({...formData, direccion_envio: e.target.value})}
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-black text-blue-500 uppercase text-xs tracking-widest ml-1">Productos y Servicios</h2>
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
              
              {/* 1. Vista de Escritorio */}
              <table className="w-full text-left hidden md:table">
                <thead className="bg-slate-800/50 text-[10px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="p-4">Descripción</th>
                    <th className="p-4 w-32 text-center">Precio</th>
                    <th className="p-4 w-24 text-center">Cant.</th>
                    <th className="p-4 w-40 text-right">Subtotal</th>
                    <th className="p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {formData.productos.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-900/50">
                      <td className="p-2">
                        <input type="text" className="w-full bg-transparent p-2 outline-none text-white font-medium" value={p.nombre} onChange={e => updateProduct(i, 'nombre', e.target.value)} />
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center bg-slate-900 border border-slate-700 rounded-lg px-2">
                           <span className="text-slate-500 text-xs">C$</span>
                           {/* FIX PRECIO: Elimina el cero inicial al escribir en escritorio */}
                           <input 
                             type="number" 
                             inputMode="decimal" 
                             className="bg-transparent w-full p-2 outline-none text-center text-white" 
                             value={p.precio_unidad} 
                             onChange={e => {
                               const val = parseFloat(e.target.value) || 0;
                               if (e.target.value.startsWith('0') && e.target.value.length > 1 && !e.target.value.startsWith('0.')) {
                                 e.target.value = val.toString();
                               }
                               updateProduct(i, 'precio_unidad', val);
                             }} 
                           />
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        {/* FIX CANTIDAD: Elimina el cero inicial al escribir en escritorio */}
                        <input 
                          type="number" 
                          inputMode="numeric" 
                          className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-center text-white" 
                          value={p.cantidad} 
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 0;
                            if (e.target.value.startsWith('0') && e.target.value.length > 1) {
                              e.target.value = val.toString();
                            }
                            updateProduct(i, 'cantidad', val);
                          }} 
                        />
                      </td>
                      <td className="p-4 text-right font-black text-blue-400">C$ {p.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="p-2 text-center">
                        <button onClick={() => removeProduct(i)} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 2. Vista Móvil (Tarjetas Apiladas Independientes) */}
              <div className="block md:hidden divide-y divide-slate-800">
                {formData.productos.map((p, i) => (
                  <div key={i} className="p-4 space-y-4 bg-slate-950 hover:bg-slate-900/20 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Item #{i + 1}</span>
                      <button onClick={() => removeProduct(i)} className="text-slate-500 hover:text-red-500 transition-colors p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Descripción</span>
                      <input 
                        type="text" 
                        className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl outline-none text-white text-sm font-medium focus:border-blue-600" 
                        placeholder="Nombre del producto o servicio..." 
                        value={p.nombre} 
                        onChange={e => updateProduct(i, 'nombre', e.target.value)} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Precio Unitario</span>
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3">
                          <span className="text-slate-500 text-xs font-bold mr-1">C$</span>
                          {/* FIX PRECIO MÓVIL: Limpieza estricta de cadenas con ceros a la izquierda */}
                          <input 
                            type="number" 
                            inputMode="decimal"
                            className="bg-transparent w-full p-3 outline-none text-white text-sm" 
                            value={p.precio_unidad} 
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              if (e.target.value.startsWith('0') && e.target.value.length > 1 && !e.target.value.startsWith('0.')) {
                                e.target.value = val.toString();
                              }
                              updateProduct(i, 'precio_unidad', val);
                            }} 
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cantidad</span>
                        {/* FIX CANTIDAD MÓVIL: Limpieza estricta de cadenas con ceros a la izquierda */}
                        <input 
                          type="number" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-center text-white text-sm outline-none focus:border-blue-600" 
                          value={p.cantidad} 
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 0;
                            if (e.target.value.startsWith('0') && e.target.value.length > 1) {
                              e.target.value = val.toString();
                            }
                            updateProduct(i, 'cantidad', val);
                          }} 
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Subtotal Item</span>
                      <span className="font-black text-blue-400 text-sm">C$ {p.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Común Adaptable (Botón e Importes Totales) */}
              <div className="p-6 bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-800">
                <button onClick={addProduct} className="w-full sm:w-auto flex items-center justify-center gap-2 text-blue-500 font-black text-xs uppercase hover:text-blue-400 transition-all border border-slate-800 sm:border-none p-3 sm:p-0 rounded-xl bg-slate-900/40 sm:bg-transparent">
                  <Plus size={18} className="bg-blue-500/10 rounded-full p-0.5" /> Agregar Item
                </button>
                <div className="text-center sm:text-right w-full sm:w-auto flex sm:flex-col justify-between sm:justify-start items-center sm:items-end border-t sm:border-none pt-3 sm:pt-0 border-slate-800/60">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Gran Total</p>
                  <p className="text-2xl sm:text-3xl font-black text-white">C$ {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h2 className="font-black text-blue-500 uppercase text-xs tracking-widest ml-1">Notas</h2>
              <div className="rounded-2xl overflow-hidden border border-slate-800">
                <ReactQuill theme="snow" value={formData.notas} onChange={v => setFormData({...formData, notas: v})} />
              </div>
            </div>

            <div className="space-y-4">
              {/* FIX: Se añade cabecera flex con botón de descarga empaquetado */}
              <div className="flex justify-between items-center ml-1">
                <h2 className="font-black text-blue-500 uppercase text-xs tracking-widest">Galería</h2>
                {images.length > 0 && (
                  <button
                    onClick={handleDownloadZip}
                    disabled={isZipping}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
                  >
                    <Download size={14} className={isZipping ? "animate-bounce" : ""} />
                    {isZipping ? "Comprimiendo..." : "Descargar ZIP"}
                  </button>
                )}
              </div>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-800/50 hover:border-blue-500 transition-all group">
                <Upload className="mx-auto mb-2 text-slate-500 group-hover:text-blue-500" size={40} />
                <p className="text-xs font-bold text-slate-500 uppercase">Añadir Fotos</p>
                <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
                    <img src={img.preview} className="w-full h-full object-cover cursor-pointer" onClick={() => img.progress === 100 && setCarouselIndex(idx)} />
                    {img.progress < 100 && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center p-3">
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-300" style={{width: `${img.progress}%`}} />
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={() => handleRemoveImage(img)} 
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                    >
                      <X size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => handleSave()} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-500 shadow-[0_10px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3">
            <Save size={24}/> {orderId ? 'ACTUALIZAR ORDEN' : 'GUARDAR ORDEN'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {carouselIndex !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
            <button className="absolute top-6 right-6 text-white bg-slate-800 p-2 rounded-full" onClick={() => setCarouselIndex(null)}><X size={32}/></button>
            <button className="absolute left-4 text-white hover:text-blue-500" onClick={() => setCarouselIndex(prev => (prev! > 0 ? prev! - 1 : images.length - 1))}><ChevronLeft size={60}/></button>
            <motion.img key={carouselIndex} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={images[carouselIndex].preview} className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl" />
            <button className="absolute right-4 text-white hover:text-blue-500" onClick={() => setCarouselIndex(prev => (prev! < images.length - 1 ? prev! + 1 : 0))}><ChevronRight size={60}/></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrapper para Suspense necesario al usar useSearchParams en Next.js
export default function PedidoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Cargando...</div>}>
      <PedidoContent />
    </Suspense>
  );
}
