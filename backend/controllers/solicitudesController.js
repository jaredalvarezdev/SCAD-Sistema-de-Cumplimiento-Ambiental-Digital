const supabase = require('../config/supabase');
const { crearNotificacionInterna } = require('./notificacionesController');

/* ---------------- LISTAR SOLICITUDES ---------------- */
const listarSolicitudes = async (req, res) => {
  try {
    const empresaId = Number(req.params.id);

    if (req.user.rol_id !== 1 && Number(req.user.empresa_id) !== empresaId) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    // Traemos también datos del usuario solicitante para mostrar en el frontend
    const { data, error } = await supabase
      .from('solicitudes_union')
      .select(`
        id,
        usuario_id,
        estado,
        creado_en,
        usuarios ( id, nombre, email )
      `)
      .eq('empresa_id', empresaId)
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: false });

    if (error) return res.status(500).json({ mensaje: error.message });

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

/* ---------------- SOLICITAR UNIÓN (usuario normal) ---------------- */
// El usuario llama este endpoint para pedir unirse a una empresa como auditor
const solicitarUnion = async (req, res) => {
  try {
    const empresa_id  = Number(req.params.empresa_id);
    const usuario_id  = req.user.id;

    // Verificar que no tenga ya una solicitud pendiente
    const { data: existente } = await supabase
      .from('solicitudes_union')
      .select('id, estado')
      .eq('empresa_id', empresa_id)
      .eq('usuario_id', usuario_id)
      .eq('estado', 'pendiente')
      .single();

    if (existente) {
      return res.status(409).json({ mensaje: 'Ya tienes una solicitud pendiente para esta empresa' });
    }

    // Crear la solicitud
    const { data: nuevaSolicitud, error } = await supabase
      .from('solicitudes_union')
      .insert([{ empresa_id, usuario_id, estado: 'pendiente' }])
      .select()
      .single();

    if (error) return res.status(500).json({ mensaje: error.message });

    // ── Notificar al usuario dueño/admin de la empresa ──────────────────────
    // Buscamos el usuario con empresa_id y rol de empresa (rol_id = 2)
    const { data: duenoEmpresa } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('empresa_id', empresa_id)
      .eq('rol_id', 2)           // 2 = empresa / admin empresa
      .limit(1)
      .single();

    const { data: usuarioSolicitante } = await supabase
      .from('usuarios')
      .select('nombre, email')
      .eq('id', usuario_id)
      .single();

    if (duenoEmpresa) {
      const nombreSolicitante = usuarioSolicitante?.nombre || usuarioSolicitante?.email || 'Un usuario';
      await crearNotificacionInterna(
        duenoEmpresa.id,
        `📋 Solicitud de auditor: ${nombreSolicitante} desea unirse a tu empresa como auditor. Revisa las solicitudes pendientes.`
      );
    }

    res.status(201).json({ mensaje: 'Solicitud enviada correctamente', data: nuevaSolicitud });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

/* ---------------- ACEPTAR SOLICITUD ---------------- */
const aceptarSolicitud = async (req, res) => {
  try {
    const empresa_id   = Number(req.params.empresa_id);
    const solicitud_id = Number(req.params.solicitud_id);

    if (req.user.rol_id !== 1 && Number(req.user.empresa_id) !== empresa_id) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    const { data: solicitud, error } = await supabase
      .from('solicitudes_union')
      .select('*')
      .eq('id', solicitud_id)
      .eq('empresa_id', empresa_id)
      .single();

    if (error || !solicitud)
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'pendiente')
      return res.status(400).json({ mensaje: 'La solicitud ya fue procesada' });

    // Actualizar usuario — asignarle la empresa
    const { error: errorUsuario } = await supabase
      .from('usuarios')
      .update({ empresa_id })
      .eq('id', solicitud.usuario_id);

    if (errorUsuario) return res.status(400).json({ mensaje: errorUsuario.message });

    // Marcar solicitud como aceptada
    const { error: errorSolicitud } = await supabase
      .from('solicitudes_union')
      .update({ estado: 'aceptada' })
      .eq('id', solicitud_id);

    if (errorSolicitud) return res.status(400).json({ mensaje: errorSolicitud.message });

    // ── Notificar al usuario que fue aceptado ────────────────────────────────
    const { data: empresa } = await supabase
      .from('empresas')
      .select('nombre')
      .eq('id', empresa_id)
      .single();

    const nombreEmpresa = empresa?.nombre || 'la empresa';

    await crearNotificacionInterna(
      solicitud.usuario_id,
      `Solicitud aceptada: Tu solicitud para unirte a ${nombreEmpresa} como auditor fue aprobada. ¡Ya puedes acceder a sus reportes!`
    );

    res.json({ mensaje: 'Solicitud aceptada correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

/* ---------------- RECHAZAR SOLICITUD ---------------- */
const rechazarSolicitud = async (req, res) => {
  try {
    const empresa_id   = Number(req.params.empresa_id);
    const solicitud_id = Number(req.params.solicitud_id);

    if (req.user.rol_id !== 1 && Number(req.user.empresa_id) !== empresa_id) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    const { data: solicitud } = await supabase
      .from('solicitudes_union')
      .select('*')
      .eq('id', solicitud_id)
      .eq('empresa_id', empresa_id)
      .single();

    if (!solicitud)
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'pendiente')
      return res.status(400).json({ mensaje: 'La solicitud ya fue procesada' });

    const { error } = await supabase
      .from('solicitudes_union')
      .update({ estado: 'rechazada' })
      .eq('id', solicitud_id);

    if (error) return res.status(400).json({ mensaje: error.message });

    // ── Notificar al usuario que fue rechazado ───────────────────────────────
    const { data: empresa } = await supabase
      .from('empresas')
      .select('nombre')
      .eq('id', empresa_id)
      .single();

    const nombreEmpresa = empresa?.nombre || 'la empresa';

    await crearNotificacionInterna(
      solicitud.usuario_id,
      `Solicitud rechazada: Tu solicitud para unirte a ${nombreEmpresa} como auditor no fue aprobada.`
    );

    res.json({ mensaje: 'Solicitud rechazada correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

module.exports = {
  listarSolicitudes,
  solicitarUnion,
  aceptarSolicitud,
  rechazarSolicitud,
};