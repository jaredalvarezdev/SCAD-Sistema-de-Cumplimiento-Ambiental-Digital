const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

/* ---------------- REGISTRAR USUARIO + EMPRESA ---------------- */
const registrarUsuario = async (req, res) => {
  try {
    let {
      nombre,
      email,
      password,
      rol_id,
      empresa_id,
      secret_admin,
      empresa_nombre,
      empresa_rfc,
      empresa_direccion,
      empresa_telefono,
      empresa_ciudad,
      empresa_tipo,
      empresa_estado
    } = req.body;

    rol_id = Number(rol_id);

    if (!nombre || !email || !password || !rol_id) {
      return res.status(400).json({ mensaje: "Faltan campos obligatorios" });
    }

    if (rol_id === 1 && secret_admin !== process.env.SECRET_ADMIN_KEY) {
      return res.status(403).json({ mensaje: "No autorizado para crear admin global" });
    }

    const { data: usuarioExistente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (usuarioExistente) return res.status(400).json({ mensaje: "El email ya está registrado" });

    const empresa_id_original = empresa_id;

    if (rol_id === 2 && (!empresa_id || empresa_id === "null")) {
      if (!empresa_nombre || !empresa_rfc) {
        return res.status(400).json({ mensaje: "Faltan datos de la empresa (nombre y RFC son obligatorios)" });
      }

      const { data: nuevaEmpresa, error: errorEmpresa } = await supabase
        .from('empresas')
        .insert([{
          nombre:             empresa_nombre,
          rfc:                empresa_rfc,
          direccion:          empresa_direccion  || '',
          telefono:           empresa_telefono   || '',
          ciudad:             empresa_ciudad     || '',
          tipo_empresa:       empresa_tipo       || '',
          estado:             empresa_estado     || 'activa',
          nivel_cumplimiento: 0,
          email
        }])
        .select();

      if (errorEmpresa) {
        return res.status(500).json({ mensaje: "Error al crear empresa: " + errorEmpresa.message });
      }

      empresa_id = nuevaEmpresa[0].id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: nuevoUsuario, error: errorUsuario } = await supabase
      .from('usuarios')
      .insert([{
        nombre,
        email,
        password:   hashedPassword,
        rol_id,
        empresa_id: rol_id === 1 ? null : empresa_id,
        activo:     true,
        creado_en:  new Date()
      }])
      .select('id, nombre, email, rol_id, empresa_id');

    if (errorUsuario) {
      return res.status(500).json({ mensaje: "Error al crear usuario: " + errorUsuario.message });
    }

    let mensajeFinal = "Usuario creado correctamente";
    if (rol_id === 2 && !empresa_id_original) {
      mensajeFinal = "Usuario y empresa creados correctamente";
    }

    res.status(201).json({ mensaje: mensajeFinal, data: nuevoUsuario });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

/* ---------------- LOGIN ---------------- */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email, password, rol_id, empresa_id, activo')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    if (!user.activo) return res.status(403).json({ mensaje: "Usuario desactivado" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: user.id, rol_id: user.rol_id, empresa_id: user.empresa_id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ mensaje: "Login exitoso", token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

/* ---------------- RECUPERACION DE CONTRASEÑA ---------------- */
const solicitarRecuperacion = async (req, res) => {
  try {
    const { email, tipo_envio } = req.body;
    if (!email || !tipo_envio) return res.status(400).json({ mensaje: "Faltan datos" });

    const { data: user } = await supabase
      .from('usuarios')
      .select('id, nombre, email, telefono')
      .eq('email', email)
      .single();

    if (!user) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracion = new Date(Date.now() + 15 * 60000);

    await supabase.from('recuperacion_contrasena').insert([{
      usuario_id: user.id,
      codigo,
      tipo_envio,
      creado_en:  new Date(),
      expiracion,
      usado:      false
    }]);

    if (tipo_envio === 'email') {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
      });
      await transporter.sendMail({
        from:    process.env.GMAIL_USER,
        to:      user.email,
        subject: 'Código de recuperación',
        text:    `Tu código es: ${codigo}`
      });
    } else if (tipo_envio === 'sms') {
      if (!user.telefono) return res.status(400).json({ mensaje: "Usuario no tiene teléfono registrado" });
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      await client.messages.create({
        body: `Tu código de recuperación es: ${codigo}`,
        from: process.env.TWILIO_PHONE,
        to:   user.telefono
      });
    }

    res.json({ mensaje: `Código de recuperación enviado por ${tipo_envio}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al enviar código" });
  }
};

/* ---------------- CAMBIAR CONTRASEÑA ---------------- */
const cambiarContrasena = async (req, res) => {
  try {
    const { codigo, nuevaPassword } = req.body;
    if (!codigo || !nuevaPassword) return res.status(400).json({ mensaje: "Faltan datos" });

    const { data: record } = await supabase
      .from('recuperacion_contrasena')
      .select('id, usuario_id, usado, expiracion')
      .eq('codigo', codigo)
      .maybeSingle();

    if (!record) return res.status(404).json({ mensaje: "Código inválido" });
    if (record.usado) return res.status(400).json({ mensaje: "Código ya usado" });
    if (new Date() > new Date(record.expiracion)) return res.status(400).json({ mensaje: "Código expirado" });

    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    await supabase
      .from('usuarios')
      .update({ password: hashedPassword })
      .eq('id', record.usuario_id);

    await supabase
      .from('recuperacion_contrasena')
      .update({ usado: true })
      .eq('id', record.id);

    res.json({ mensaje: "Contraseña cambiada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

/* ---------------- EDITAR USUARIO ---------------- */
const editarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol_id, activo, empresa_id } = req.body;

    if (req.user.rol_id !== 1) {
      return res.status(403).json({ mensaje: "Solo admins pueden editar usuarios" });
    }

    const datosActualizar = { nombre, email, rol_id, activo };

    if (empresa_id !== undefined) {
      datosActualizar.empresa_id = empresa_id;
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update(datosActualizar)
      .eq('id', id)
      .select();

    if (error) return res.status(500).json({ mensaje: error.message });

    res.json({ mensaje: "Usuario actualizado", data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

/* ---------------- ELIMINAR USUARIO (CON CASCADA SILENCIOSA) ---------------- */
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.rol_id !== 1) {
      return res.status(403).json({ mensaje: "Solo admins pueden eliminar usuarios" });
    }

    const { data: reportes } = await supabase
      .from('reportes')
      .select('id')
      .eq('usuario_id', id);

    const reporteIds = reportes ? reportes.map(r => r.id) : [];

    if (reporteIds.length > 0) {
      await supabase.from('auditorias').delete().in('reporte_id', reporteIds);
      await supabase.from('comentarios').delete().in('reporte_id', reporteIds);
      await supabase.from('evidencias').delete().in('reporte_id', reporteIds);
      await supabase.from('reportes').delete().eq('usuario_id', id);
    }

    await supabase.from('auditorias').delete().eq('usuario_id', id);

    const { error: errorUsuario } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (errorUsuario) return res.status(500).json({ mensaje: 'Error al eliminar usuario' });

    res.json({ mensaje: "Usuario y sus datos asociados eliminados correctamente" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

/* ---------------- OBTENER USUARIOS ---------------- */
const obtenerUsuarios = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol_id, empresa_id, activo');

    if (error) return res.status(500).json({ mensaje: error.message });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
};

module.exports = {
  registrarUsuario,
  login,
  solicitarRecuperacion,
  cambiarContrasena,
  editarUsuario,
  eliminarUsuario,
  obtenerUsuarios
};