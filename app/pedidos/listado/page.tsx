"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Calendar, Edit3, ChevronLeft, ChevronRight, Filter, Phone, User, Plus, Trash2, Layers, Lock } from 'lucide-react';

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

// Función helper para los colores de los badges de estado
const getStatusStyles = (status: string) => {
  switch (status) {
    case 'Nuevo Cliente': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Imprimir': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'Envios': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'DTF': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
    case 'Finalizado': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'Cotizacion': return 'bg-slate-800 text-slate-400 border-slate-700';
    case 'Urge': return 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
    case 'Empezado': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'Juan': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    default: return 'bg-slate-900 text-slate-500 border-slate-800';
  }
};

function ListadoContent() {
  const searchParams = useSearchParams();
  
  // Captura la página de la URL si el usuario regresa de editar, de lo contrario inicia en 1
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  // Capturar el ID que se desea auto-enfocar al cargar el componente
  const highlightId = searchParams.get('highlightId');

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tipoFecha, setTipoFecha] = useState('fecha_solicitud');
  const [estadoFilter, setEstadoFilter] = useState(''); 
  const [dates, setDates] = useState({ ini: '', fin: '' });
  const [pagination, setPagination] = useState({ current: initialPage, total: 1 });
  const [loading, setLoading] = useState(true);

  // NUEVO: Estado para IDs seleccionados (Bulk Delete)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Estado local para controlar el pedido resaltado dinámicamente
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  // Sincronizar el parámetro de la URL con el estado local al montar
  useEffect(() => {
    const urlId = searchParams.get('highlightId');
    if (urlId) {
      setActiveHighlightId(urlId);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPedidos();
    // Limpiar selección al cambiar de filtros o página para evitar errores
    setSelectedIds([]);
  }, [search, dates, pagination.current, tipoFecha, estadoFilter]);

  // Efecto encargado de desplazar la pantalla suavemente hacia el pedido editado
  useEffect(() => {
    if (!loading && activeHighlightId && pedidos.length > 0) {
      const timer = setTimeout(() => {
        const targetElement = document.getElementById(`pedido-${activeHighlightId}`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

          const url = new URL(window.location.href);
          url.searchParams.delete('highlightId');
          window.history.replaceState({}, '', url.toString());
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, activeHighlightId, pedidos]);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: search,
        fecha_ini: dates.ini,
        fecha_fin: dates.fin,
        tipo_fecha: tipoFecha,
        estado: estadoFilter, 
        page: pagination.current.toString()
      });
      
      const res = await fetch(`/api/pedidos/list?${params}`);
      const data = await res.json();
      setPedidos(data.pedidos || []);
      setPagination(prev => ({ ...prev, total: data.totalPages || 1 }));
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, nuevoEstado: string) => {
    try {
      const res = await fetch('/api/pedidos/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: nuevoEstado })
      });
      const data = await res.json();
      if (data.success) {
        setPedidos((prev: any) =>
          prev.map((p: any) => p.id === id ? { ...p, estado: nuevoEstado } : p)
        );
      } else {
        alert("No se pudo actualizar el estado");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeletePedido = async (id: number) => {
    const totalConfirm = confirm(`¿Está completamente seguro de eliminar la Orden #${id.toString().padStart(5, '0')}?\nEsta acción borrará permanentemente los productos vinculados y archivos de imagen.`);
    
    if (!totalConfirm) return;

    try {
      const res = await fetch(`/api/api/pedidos/delete?id=${id}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      
      if (result.success) {
        setSelectedIds(prev => prev.filter(item => item !== id));
        fetchPedidos();
      } else {
        alert(`Error al procesar la solicitud: ${result.error}`);
      }
    } catch (error) {
      console.error("Error en la solicitud de eliminación:", error);
      alert("Hubo un fallo crítico de comunicación con el servidor.");
    }
  };

  // NUEVO: Handler para eliminación masiva (Bulk Delete)
  const handleBulkDelete = async () => {
    const totalConfirm = confirm(`¿Está completamente seguro de eliminar las ${selectedIds.length} órdenes seleccionadas?\nEsta acción borrará permanentemente de forma masiva todos los productos vinculados y archivos multimedia.`);
    
    if (!totalConfirm) return;

    try {
      // Nota: Asumiendo que tu API soporta la eliminación por lotes. 
      // Si la API actual sólo recibe un ID, puedes iterar las llamadas o adaptar la query /api/pedidos/delete?ids=1,2,3
      const res = await fetch(`/api/pedidos/delete-bulk`, {
        method: 'POST', // O DELETE con body dependiendo de tu backend
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      
      const result = await res.json();
      
      if (result.success) {
        alert(`${selectedIds.length} órdenes eliminadas con éxito.`);
        setSelectedIds([]);
        fetchPedidos();
      } else {
        alert(`Error al procesar la eliminación masiva: ${result.error}`);
      }
    } catch (error) {
      console.error("Error en eliminación masiva:", error);
      alert("Hubo un fallo en la red al intentar borrar en lote.");
    }
  };

  // NUEVO: Funciones auxiliares de selección de Checkboxes
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const currentIds = pedidos.map((p: any) => p.id);
      setSelectedIds(currentIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-10 text-slate-200 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white italic uppercase">Historial de Órdenes</h1>
            <p className="text-slate-500 text-sm">Registro centralizado de pedidos y producción.</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            {/* NUEVO: Botón de borrado masivo condicional */}
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-950/20 text-sm uppercase tracking-wider"
              >
                <Trash2 size={18} /> Eliminar Seleccionados ({selectedIds.length})
              </button>
            )}
            
            <Link href="/pedidos" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 text-sm whitespace-nowrap">
              <Plus size={20} /> Nueva Orden
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" placeholder="Buscar cliente o teléfono..." 
              className="w-full bg-slate-950 border border-slate-700 p-3 pl-10 rounded-xl outline-none focus:border-blue-600 transition-all"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="relative">
            <select 
              className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-sm font-bold text-slate-300 focus:border-blue-600"
              value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              {ESTADOS_DISPONIBLES.map(est => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 lg:col-span-2">
            <select 
              className="bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-sm font-bold text-slate-400"
              value={tipoFecha} onChange={(e) => setTipoFecha(e.target.value)}
            >
              <option value="fecha_solicitud">Fecha Pedido</option>
              <option value="fecha_entrega">Fecha Entrega</option>
            </select>
            <input type="date" className="bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-sm" value={dates.ini} onChange={(e) => setDates({...dates, ini: e.target.value})} />
            <input type="date" className="bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none text-sm" value={dates.fin} onChange={(e) => setDates({...dates, fin: e.target.value})} />
          </div>

          <button onClick={() => { setDates({ini:'', fin:''}); setEstadoFilter(''); setSelectedIds([]); }} className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest text-center">
            Limpiar Filtros
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  {/* NUEVO: Th para el selector general */}
                  <th className="p-5 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer bg-slate-950 border-slate-700"
                      checked={pedidos.length > 0 && selectedIds.length === pedidos.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-5">ID</th>
                  <th className="p-5">Cliente</th>
                  <th className="p-5">Entrega</th>
                  <th className="p-5">Estado de Trabajo</th>
                  <th className="p-5">Envío</th>
                  <th className="p-5 text-right">Total</th>
                  <th className="p-5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && pedidos.length === 0 ? (
                  <tr><td colSpan={8} className="p-20 text-center animate-pulse text-slate-600 font-bold uppercase tracking-widest">Sincronizando registros...</td></tr>
                ) : pedidos.length === 0 ? (
                  <tr><td colSpan={8} className="p-20 text-center text-slate-600 italic">No hay registros que coincidan con la búsqueda.</td></tr>
                ) : pedidos.map((p: any) => {
                  const isFocused = p.id.toString() === highlightId;
                  const isChecked = selectedIds.includes(p.id);
                return (
                  <tr 
                    key={p.id}
                    id={`pedido-${p.id}`} 
                    className={`transition-all duration-500 border-l-4 ${
                        isChecked
                          ? 'bg-red-500/5 border-red-500 text-white font-medium shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]'
                          : isFocused 
                            ? 'bg-blue-600/10 border-blue-500 text-white font-medium shadow-[inset_0_0_20px_rgba(37,99,235,0.15)]' 
                            : 'hover:bg-slate-800/30 border-transparent transition-colors group'
                      }`}>
                    {/* NUEVO: Td con checkbox para cada item individual */}
                    <td className="p-5 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer bg-slate-950 border-slate-700"
                        checked={isChecked}
                        onChange={(e) => handleSelectItem(p.id, e.target.checked)}
                      />
                    </td>
                    <td className="p-5 font-mono text-blue-500 text-xs font-bold">#{p.id.toString().padStart(5, '0')}</td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-2 tracking-tight">{p.nombre_cliente}</span>
                        <span className="text-xs text-slate-500">{p.telefono}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="text-amber-500 text-xs font-black">{p.fecha_entrega || 'Pendiente'}</span>
                    </td>
                    <td className="p-5">
                      <div className={`inline-flex items-center rounded-xl border px-2 py-1 gap-1 text-xs font-bold transition-all ${getStatusStyles(p.estado)}`}>
                        <Layers size={12} className="opacity-70" />
                        <select 
                          className="bg-transparent outline-none font-bold cursor-pointer text-xs pr-2"
                          value={p.estado || "Nuevo Cliente"}
                          onChange={(e) => handleStatusUpdate(p.id, e.target.value)}
                        >
                          {ESTADOS_DISPONIBLES.map(est => (
                            <option key={est} value={est} className="bg-slate-900 text-slate-200 font-bold">{est}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-5">
                      {p.requiere_envio === 1 ? 
                        <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2 py-1 rounded uppercase border border-blue-500/20">Domicilio</span> :
                        <span className="bg-slate-800 text-slate-500 text-[9px] font-black px-2 py-1 rounded uppercase">Retiro Local</span>
                      }
                    </td>
                    <td className="p-5 text-right font-black text-white">
                      C$ {p.grand_total?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className="p-5 text-center flex items-center justify-center gap-2">
                        <Link 
                          href={`/pedidos?id=${p.id}&returnPage=${pagination.current}`}
                          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          <Edit3 size={14} /> Editar
                        </Link>
                      <button
                        onClick={() => handleDeletePedido(p.id)}
                        className="inline-flex items-center gap-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="bg-slate-950 p-4 flex justify-between items-center border-t border-slate-800">
            <span className="text-xs text-slate-500 font-bold uppercase">Página {pagination.current} de {pagination.total}</span>
            <div className="flex gap-2">
              <button 
                disabled={pagination.current === 1}
                onClick={() => setPagination(prev => ({...prev, current: prev.current - 1}))}
                className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-20 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                disabled={pagination.current === pagination.total || false}
                onClick={() => setPagination(prev => ({...prev, current: prev.current + 1}))}
                className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-20 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper con protección de contraseña y Suspense para Next.js
export default function ListadoPedidos() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    // Comprobar si ya fue autenticado previamente en esta sesión de navegador
    const authStatus = localStorage.getItem('page_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'martinez2010*') {
      localStorage.setItem('page_authenticated', 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPasswordInput('');
    }
  };

  // Prevenir parpadeos mientras lee localStorage
  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black uppercase tracking-widest">Iniciando Sistema...</div>;
  }

  // Vista de bloqueo si no está autenticado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-900/10">
            <Lock size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Acceso Restringido</h2>
            <p className="text-slate-500 text-sm mt-1">Ingrese la clave de acceso para ver el historial de órdenes.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Contraseña"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className={`w-full bg-slate-950 border ${error ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-blue-600'} p-4 rounded-xl outline-none transition-all text-center tracking-widest font-bold text-white`}
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-xs font-bold uppercase tracking-wider animate-bounce">Contraseña incorrecta</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 uppercase text-xs tracking-widest"
            >
              Verificar Clave
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black uppercase tracking-widest">Iniciando Sistema...</div>}>
      <ListadoContent />
    </Suspense>
  );
}