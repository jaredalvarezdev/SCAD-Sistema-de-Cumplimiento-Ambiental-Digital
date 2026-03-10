const supabase = require('../config/supabase');
const { registrarHistorial } = require('./historialHelper');
const { crearNotificacionInterna } = require('./notificacionesController'); // ← NUEVO

/* ── Helper: obtener id del primer admin ── */
const getAdminId = async () => {
  const { data } = await supabase
    .from('usuarios').select('id').eq('rol_id', 1).limit(1).single();
  return data?.id || null;
};

/* ---------------- OBTENER TODAS LAS EMPRESAS CON ESTADÍSTICAS ---------------- */
const obtenerEmpresas = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) return res.status(500).json({ mensaje: error.message });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

/* ---------------- OBTENER ESTADÍSTICAS DE EMPRESAS ---------------- */
const obtenerEstadisticasEmpresas = async (req, res) => {
  try {
    // Total de empresas
    const { count: totalEmpresas } = await supabase
      .from('empresas')
      .select('*', { count: 'exact', head: true });

    // Empresas activas
    const { count: empresasActivas } = await supabase
      .from('empresas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activa');

    // Empresas suspendidas
    const { count: empresasSuspendidas } = await supabase
      .from('empresas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'suspendida');

    // Promedio de cumplimiento
    const { data: cumplimientos, error: errorCumplimiento } = await supabase
      .from('empresas')
      .select('nivel_cumplimiento');

    let promedioCumplimiento = 0;
    if (cumplimientos && cumplimientos.length > 0) {
      const suma = cumplimientos.reduce((acc, emp) => acc + (emp.nivel_cumplimiento || 0), 0);
      promedioCumplimiento = Math.round(suma / cumplimientos.length);
    }

    res.json({
      totalEmpresas:       totalEmpresas       || 0,
      empresasActivas:     empresasActivas     || 0,
      empresasSuspendidas: empresasSuspendidas || 0,
      promedioCumplimiento
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

/* ---------------- OBTENER EMPRESA POR ID ---------------- */
const obtenerEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ mensaje: "Empresa no encontrada" });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

/* ---------------- CREAR EMPRESA ---------------- */
const crearEmpresa = async (req, res) => {
  try {
    const { nombre, rfc, email, telefono, direccion, ciudad, tipo_empresa, estado, nivel_cumplimiento } = req.body;

    if (!req.user || req.user.rol_id !== 1) {
      return res.status(403).json({ mensaje: "Solo admins pueden crear empresas" });
    }

    if (!nombre) {
      return res.status(400).json({ mensaje: "El nombre de la empresa es requerido" });
    }

    const { data, error } = await supabase
      .from('empresas')
      .insert([{
        nombre,
        rfc:                rfc               || null,
        email:              email             || null,
        telefono:           telefono          || null,
        direccion:          direccion         || null,
        ciudad:             ciudad            || null,
        tipo_empresa:       tipo_empresa      || null,
        estado:             estado            || 'activa',
        nivel_cumplimiento: nivel_cumplimiento || 0,
        creado_en: new Date()
      }])
      .select();

    if (error) return res.status(500).json({ mensaje: error.message });

    await registrarHistorial(req.user.id, 'empresas', 'crear', data[0].id,
      `Se creó la empresa "${nombre}"`);

    // ← NUEVO: notificar al admin
    const adminId = await getAdminId();
    if (adminId) {
      await crearNotificacionInterna(adminId,
        `Nueva empresa registrada: ${nombre} fue agregada al sistema`);
    }

    res.status(201).json({ mensaje: "Empresa creada correctamente", data: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

/* ---------------- EDITAR EMPRESA ---------------- */
const editarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rfc, email, telefono, direccion, ciudad, tipo_empresa, estado, nivel_cumplimiento } = req.body;

    if (!req.user || req.user.rol_id !== 1) {
      return res.status(403).json({ mensaje: "Solo admins pueden editar empresas" });
    }

    if (!nombre) {
      return res.status(400).json({ mensaje: "El nombre de la empresa es requerido" });
    }

    const { data, error } = await supabase
      .from('empresas')
      .update({
        nombre,
        rfc:                rfc               || null,
        email:              email             || null,
        telefono:           telefono          || null,
        direccion:          direccion         || null,
        ciudad:             ciudad            || null,
        tipo_empresa:       tipo_empresa      || null,
        estado:             estado            || 'activa',
        nivel_cumplimiento: nivel_cumplimiento || 0
      })
      .eq('id', id)
      .select();

    if (error) return res.status(500).json({ mensaje: error.message });

    if (data.length === 0) return res.status(404).json({ mensaje: "Empresa no encontrada" });

    await registrarHistorial(req.user.id, 'empresas', 'editar', parseInt(id),
      `Se editó la empresa "${nombre}"`);

    res.json({ mensaje: "Empresa actualizada correctamente", data: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

/* ---------------- ELIMINAR EMPRESA (CON CASCADA) ---------------- */
const eliminarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.rol_id !== 1) {
      return res.status(403).json({ mensaje: "Solo admins pueden eliminar empresas" });
    }

    const { data: empresa } = await supabase
      .from('empresas')
      .select('nombre')
      .eq('id', id)
      .single();

    // Obtener los usuarios de esta empresa
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('usuarios')
      .select('id')
      .eq('empresa_id', id);

    if (errorUsuarios) {
      return res.status(500).json({ mensaje: 'Error al obtener usuarios' });
    }

    const usuarioIds = usuarios ? usuarios.map(u => u.id) : [];

    if (usuarioIds.length > 0) {
      const { data: reportes } = await supabase
        .from('reportes')
        .select('id')
        .in('usuario_id', usuarioIds);

      const reporteIds = reportes ? reportes.map(r => r.id) : [];

      if (reporteIds.length > 0) {
        await supabase.from('auditorias').delete().in('reporte_id', reporteIds);
        await supabase.from('comentarios').delete().in('reporte_id', reporteIds);
        await supabase.from('evidencias').delete().in('reporte_id', reporteIds);
        await supabase.from('reportes').delete().in('id', reporteIds);
      }

      await supabase.from('auditorias').delete().in('usuario_id', usuarioIds);
      await supabase.from('usuarios').delete().in('id', usuarioIds);
    }

    const { error: errorEmpresa } = await supabase
      .from('empresas')
      .delete()
      .eq('id', id);

    if (errorEmpresa) {
      return res.status(500).json({ mensaje: 'Error al eliminar empresa' });
    }

    await registrarHistorial(req.user.id, 'empresas', 'eliminar', parseInt(id),
      `Se eliminó la empresa "${empresa?.nombre}"`);

    res.json({ mensaje: "Empresa y sus datos asociados eliminados correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

module.exports = {
  obtenerEmpresas,
  obtenerEstadisticasEmpresas,
  obtenerEmpresa,
  crearEmpresa,
  editarEmpresa,
  eliminarEmpresa
};