const supabase = require('../config/supabase')
const { validarReporteIA } = require('../services/deepCheckService')

/* ---------------- CREAR REPORTE ---------------- */
const crearReporte = async (req, res) => {
  try {
    const { titulo, descripcion } = req.body
    const { id, empresa_id, rol_id } = req.user

    if (rol_id !== 2)
      return res.status(403).json({ mensaje: 'Solo las empresas pueden crear reportes' })

    if (!titulo || !descripcion)
      return res.status(400).json({ mensaje: 'Faltan campos obligatorios' })

    if (descripcion.length < 20)
      return res.status(400).json({ mensaje: 'La descripción es demasiado corta' })

    const resultadoIA = await validarReporteIA(descripcion)

    const { data, error } = await supabase
      .from('reportes')
      .insert([{
        titulo,
        descripcion,
        usuario_id: id,
        empresa_id,
        estado_id: 1,
        validacion_ia: resultadoIA.observacion,
        confianza_ia: resultadoIA.confianza,
        modelo_ia: 'deepseek-v1',
        fecha_validacion_ia: new Date()
      }])
      .select()
      .single()

    if (error) return res.status(400).json(error)

    res.status(201).json({
      mensaje: 'Reporte creado correctamente',
      analisis_ia: resultadoIA,
      data
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- LISTAR REPORTES (CON PAGINACIÓN Y FILTROS) ---------------- */
const listarReportes = async (req, res) => {
  try {
    const { rol_id, empresa_id } = req.user
    const { estado_id, page = 1, limit = 10 } = req.query

    const from = (page - 1) * limit
    const to = from + parseInt(limit) - 1

    let query = supabase
      .from('reportes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    // Empresa solo ve los suyos
    if (rol_id === 2)
      query = query.eq('empresa_id', empresa_id)

    // Filtro por estado opcional
    if (estado_id)
      query = query.eq('estado_id', estado_id)

    const { data, error, count } = await query

    if (error) return res.status(400).json(error)

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      data
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- VER REPORTE POR ID ---------------- */
const verReporte = async (req, res) => {
  try {
    const { id } = req.params
    const { rol_id, empresa_id } = req.user

    const { data: reporte, error } = await supabase
      .from('reportes')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !reporte)
      return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    if (rol_id === 2 && reporte.empresa_id !== empresa_id)
      return res.status(403).json({ mensaje: 'No tienes acceso a este reporte' })

    res.json(reporte)

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- CAMBIAR ESTADO DEL REPORTE ---------------- */
const cambiarEstadoReporte = async (req, res) => {
  try {
    const { id } = req.params
    const { estado_id } = req.body
    const { rol_id } = req.user

    if (![1, 3].includes(rol_id))
      return res.status(403).json({ mensaje: 'No tienes permisos para cambiar el estado' })

    if (!estado_id)
      return res.status(400).json({ mensaje: 'estado_id es obligatorio' })

    // Verificar que exista el reporte
    const { data: reporte } = await supabase
      .from('reportes')
      .select('id')
      .eq('id', id)
      .single()

    if (!reporte)
      return res.status(404).json({ mensaje: 'Reporte no encontrado' })

    const { data, error } = await supabase
      .from('reportes')
      .update({ estado_id })
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(400).json(error)

    res.json({
      mensaje: 'Estado del reporte actualizado',
      data
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- ELIMINAR REPORTES POR USUARIO (CASCADA) ---------------- */
const eliminarReportesPorUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params

    // Verificar que el usuario es admin
    if (req.user.rol_id !== 1) {
      return res.status(403).json({ mensaje: 'Solo admins pueden eliminar reportes' })
    }

    // Primero obtener todos los reportes del usuario
    const { data: reportes, error: errorGet } = await supabase
      .from('reportes')
      .select('id')
      .eq('usuario_id', usuarioId)

    if (errorGet) {
      return res.status(500).json({ mensaje: 'Error al buscar reportes: ' + errorGet.message })
    }

    if (!reportes || reportes.length === 0) {
      // Si no hay reportes, simplemente retornar éxito
      return res.json({ 
        mensaje: 'No hay reportes para eliminar',
        reportesEliminados: 0
      })
    }

    // Luego eliminarlos
    const { error: errorDelete } = await supabase
      .from('reportes')
      .delete()
      .eq('usuario_id', usuarioId)

    if (errorDelete) {
      return res.status(500).json({ mensaje: 'Error al eliminar reportes: ' + errorDelete.message })
    }

    res.json({ 
      mensaje: `${reportes.length} reportes eliminados correctamente`,
      reportesEliminados: reportes.length
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ mensaje: 'Error del servidor' })
  }
}

/* ---------------- ESTADISTICAS DASHBOARD ---------------- */

const obtenerEstadisticas = async (req,res)=>{
  try{

    const {count:totalUsuarios} = await supabase
      .from('usuarios')
      .select('*',{count:'exact',head:true});

    const {count:totalEmpresas} = await supabase
      .from('empresas')
      .select('*',{count:'exact',head:true});

    const {count:totalReportes} = await supabase
      .from('reportes')
      .select('*',{count:'exact',head:true});

    const {count:totalAuditorias} = await supabase
      .from('auditorias')
      .select('*',{count:'exact',head:true});

    res.json({
      totalUsuarios,
      totalEmpresas,
      totalReportes,
      totalAuditorias
    });

  }catch(err){

    console.error(err);
    res.status(500).json({mensaje:"Error obteniendo estadísticas"});

  }
};


module.exports = {
  crearReporte,
  listarReportes,
  verReporte,
  cambiarEstadoReporte,
  eliminarReportesPorUsuario,
  obtenerEstadisticas
}