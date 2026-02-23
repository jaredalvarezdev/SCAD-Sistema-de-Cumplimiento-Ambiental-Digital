-- Base de datos SCAD (Sistema de Cumplimiento Ambiental Digital)

-- Tabla de roles del sistema (admin, empresa, auditor)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT
);

-- Tabla de usuarios del sistema
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  rol_id INT REFERENCES roles(id),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de empresas registradas
CREATE TABLE empresas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  rfc VARCHAR(13) UNIQUE,
  direccion TEXT,
  telefono VARCHAR(20),
  usuario_id INT REFERENCES usuarios(id),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de estados de los reportes
CREATE TABLE estados_reporte (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL
);

-- Tabla de reportes ambientales
CREATE TABLE reportes (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT,
  empresa_id INT REFERENCES empresas(id),
  estado_id INT REFERENCES estados_reporte(id),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de archivos de evidencia (PDF, imágenes, documentos)
CREATE TABLE evidencias (
  id SERIAL PRIMARY KEY,
  nombre_archivo TEXT NOT NULL,
  tipo_archivo VARCHAR(30),
  ruta_archivo TEXT,
  reporte_id INT REFERENCES reportes(id),
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de auditorías realizadas por auditores
CREATE TABLE auditorias (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id),
  reporte_id INT REFERENCES reportes(id),
  observaciones TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de comentarios dentro de un reporte
CREATE TABLE comentarios (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id),
  reporte_id INT REFERENCES reportes(id),
  mensaje TEXT NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de notificaciones del sistema
CREATE TABLE notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id),
  mensaje TEXT NOT NULL,
  leido BOOLEAN DEFAULT FALSE,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de permisos del sistema
CREATE TABLE permisos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT
);

-- Tabla intermedia entre roles y permisos
CREATE TABLE rol_permisos (
  id SERIAL PRIMARY KEY,
  rol_id INT REFERENCES roles(id),
  permiso_id INT REFERENCES permisos(id)
);

-- Tabla de historial de acciones del sistema
CREATE TABLE historial_cambios (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id),
  tabla_afectada VARCHAR(100),
  accion VARCHAR(50),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);