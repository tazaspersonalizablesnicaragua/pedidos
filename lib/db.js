import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'sistema_pedidos.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    nombre TEXT,
    ruc TEXT,
    grand_total REAL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    producto TEXT,
    cantidad INTEGER,
    unidad TEXT,
    precio REAL,
    total REAL,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  );
`);

// Inicialización de tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_cliente TEXT,
    telefono TEXT,
    fecha_solicitud TEXT,
    fecha_entrega TEXT,
    notificar_entrega INTEGER,
    requiere_envio INTEGER,
    direccion_envio TEXT,
    notas TEXT,
    grand_total REAL,
    estado TEXT DEFAULT 'borrador'
  );

  CREATE TABLE IF NOT EXISTS pedido_productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER,
    nombre TEXT,
    precio_unidad REAL,
    cantidad INTEGER,
    total REAL,
    FOREIGN KEY(pedido_id) REFERENCES pedidos(id)
  );

  CREATE TABLE IF NOT EXISTS pedido_imagenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER,
    ruta_imagen TEXT,
    FOREIGN KEY(pedido_id) REFERENCES pedidos(id)
  );
`);

export default db;
