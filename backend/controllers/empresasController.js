const supabase = require('../config/supabase');

/* ---------------- CREAR EMPRESA ---------------- */
const crearEmpresa = async (req, res) => {
  try {
    if (req.user.rol_id !== 1)
      return res.status(403).json({ mensaje: 'No autorizado' });

    const { nombre, rfc, direccion, telefono, email } = req.body;

    if (!nombre || !rfc || !email)
      return res.status(400).json({ mensaje: 'Nombre, RFC y email son obligatorios' });

    // Validar duplicado RFC
    const { data: existente } = await supabase
      .from('empresas')
      .select('id')
      .eq('rfc', rfc)
      .maybeSingle();

    if (existente)
      return res.status(400).json({ mensaje: 'Ya existe una empresa con ese RFC' });

    const { data, error } = await supabase
      .from('empresas')
      .insert([{ nombre, rfc, direccion, telefono, email }])
      .select()
      .single();

    if (error) return res.status(400).json({ mensaje: error.message });

    res.status(201).json({ mensaje: 'Empresa creada correctamente', data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

/* ---------------- LISTAR EMPRESAS ---------------- */
const listarEmpresas = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;

    if (req.user.rol_id === 1) {
      const { data, error, count } = await supabase
        .from('empresas')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('id', { ascending: false });

      if (error) return res.status(500).json({ mensaje: error.message });

      return res.json({
        total: count,
        page: Number(page),
        limit: Number(limit),
        data
      });
    }

    if (req.user.rol_id === 2) {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', Number(req.user.empresa_id))
        .single();

      if (error) return res.status(404).json({ mensaje: 'Empresa no encontrada' });

      return res.json([data]);
    }

    return res.status(403).json({ mensaje: 'No autorizado' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

/* ---------------- LISTAR EMPRESAS PARA USUARIO ---------------- */
const listarEmpresasParaUsuario = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre')
      .order('nombre');

    if (error) return res.status(500).json({ mensaje: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

/* ---------------- ACTUALIZAR EMPRESA ---------------- */
const actualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rfc, direccion, telefono, email } = req.body;

    if (!nombre && !rfc && !direccion && !telefono && !email)
      return res.status(400).json({ mensaje: 'No hay campos para actualizar' });

    if (
      req.user.rol_id !== 1 &&
      !(req.user.rol_id === 2 && Number(req.user.empresa_id) === Number(id))
    ) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    const { data, error } = await supabase
      .from('empresas')
      .update({ nombre, rfc, direccion, telefono, email })
      .eq('id', Number(id))
      .select()
      .single();

    if (error) return res.status(400).json({ mensaje: error.message });

    res.json({ mensaje: 'Empresa actualizada correctamente', data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

/* ---------------- ELIMINAR EMPRESA ---------------- */
const eliminarEmpresa = async (req, res) => {
  try {
    if (req.user.rol_id !== 1)
      return res.status(403).json({ mensaje: 'No autorizado' });

    const { id } = req.params;

    const { data: empresa } = await supabase
      .from('empresas')
      .select('id')
      .eq('id', Number(id))
      .single();

    if (!empresa)
      return res.status(404).json({ mensaje: 'Empresa no encontrada' });

    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', Number(id));

    if (error) return res.status(400).json({ mensaje: error.message });

    res.json({ mensaje: 'Empresa eliminada correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

module.exports = {
  crearEmpresa,
  listarEmpresas,
  listarEmpresasParaUsuario,
  actualizarEmpresa,
  eliminarEmpresa
};