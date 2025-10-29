const Usuario = require("../config/models/usuario");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const ADMIN_CEDULA = "99999999";
const ADMIN_PASSWORD = "admin123";
const ADMIN_INFO = {
    id: "admin",
    nombre: "Administrador",
    apellido: "Sistema",
    cedula: ADMIN_CEDULA,
    rol: "admin"
};

// Crear un nuevo usuario o visitante
exports.crearUsuario = async (req, res) => {
    try {
        const Visitante = require("../config/models/visitante");
        let {
            nombre, apellido, cedula, apartamento, torre,
            fechaIngreso, fechaRetiro, estadoExpensa,
            tieneVehiculo, placaVehiculo, password, rol
        } = req.body;

        rol = rol || "residente";

        // 🔹 Caso: VISITANTE
        if (rol === "visitante") {
            const visitanteExistente = await Visitante.findOne({ cedula });
            if (visitanteExistente) {
                return res.status(400).json({ error: "El visitante ya existe" });
            }

            const nuevoVisitante = new Visitante({
                nombre,
                apellido,
                cedula,
                placaVehiculo: placaVehiculo || null,
                residenteAsociado: req.body.residenteAsociado || null
            });

            await nuevoVisitante.save();

            return res.status(201).json({
                mensaje: "Visitante creado exitosamente",
                visitante: nuevoVisitante
            });
        }

        // 🔹 Caso: USUARIO
        if (cedula === ADMIN_CEDULA) {
            return res.status(400).json({ error: "No puedes registrar un usuario con esta cédula" });
        }

        const usuarioExistente = await Usuario.findOne({ cedula });
        if (usuarioExistente) {
            return res.status(400).json({ error: "El usuario ya existe" });
        }

        if (rol !== "residente") {
            apartamento = undefined;
            torre = undefined;
            estadoExpensa = "no aplica";
        }

        const estadosPermitidos = ['al dia', 'en mora', 'no aplica'];
        if (estadoExpensa && !estadosPermitidos.includes(estadoExpensa)) {
            return res.status(400).json({
                error: `Estado de expensa no válido. Use: ${estadosPermitidos.join(', ')}`
            });
        }

        tieneVehiculo = tieneVehiculo === "Si" || tieneVehiculo === true;

        const passwordHash = await bcrypt.hash(password, 10);

        const nuevoUsuario = new Usuario({
            nombre,
            apellido,
            cedula,
            apartamento,
            torre,
            fechaIngreso,
            fechaRetiro: fechaRetiro || null,
            estadoExpensa: estadoExpensa || (rol === "residente" ? "al dia" : "no aplica"),
            tieneVehiculo,
            placaVehiculo: tieneVehiculo ? placaVehiculo : null,
            password: passwordHash,
            rol
        });

        await nuevoUsuario.save();

        res.status(201).json({
            mensaje: "Usuario creado exitosamente",
            usuario: {
                id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                cedula: nuevoUsuario.cedula,
                rol: nuevoUsuario.rol,
                placaVehiculo: nuevoUsuario.placaVehiculo || null
            }
        });
    } catch (error) {
        console.error("Error al crear usuario/visitante:", error);
        res.status(500).json({
            error: "Error al crear el usuario/visitante",
            detalles: error.message
        });
    }
};

// Login de usuario
exports.loginUsuario = async (req, res) => {
    try {
        const { cedula, password } = req.body;

        if (cedula === ADMIN_CEDULA && password === ADMIN_PASSWORD) {
            const token = jwt.sign({ id: "admin", rol: "admin" }, "secreto", { expiresIn: "2h" });
            return res.json({ token, usuario: ADMIN_INFO });
        }

        const usuario = await Usuario.findOne({ cedula });
        if (!usuario) {
            return res.status(400).json({ error: "Usuario no encontrado" });
        }

        const esValida = await bcrypt.compare(password, usuario.password);
        if (!esValida) {
            return res.status(400).json({ error: "Contraseña incorrecta" });
        }

        const token = jwt.sign({ 
            id: usuario.id, 
            rol: usuario.rol || "residente" 
        }, "secreto", { expiresIn: "2h" });

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                cedula: usuario.cedula,
                rol: usuario.rol || "residente",
                placaVehiculo: usuario.placaVehiculo || null
            }
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
};

// Obtener todos los usuarios y visitantes
exports.obtenerUsuarios = async (req, res) => {
    try {
        const Visitante = require("../config/models/visitante");

        const usuarios = await Usuario.find({}, '-password -__v');
        const visitantes = await Visitante.find({}, '-__v');

        const todos = [
            ...usuarios.map(u => ({
                id: u._id,
                nombre: u.nombre,
                apellido: u.apellido,
                cedula: u.cedula,
                rol: u.rol,
                placaVehiculo: u.placaVehiculo || null,
                tipo: "usuario"
            })),
            ...visitantes.map(v => ({
                id: v._id,
                nombre: v.nombre,
                apellido: v.apellido,
                cedula: v.cedula,
                rol: "visitante",
                placaVehiculo: v.placaVehiculo || null,
                tipo: "visitante"
            }))
        ];

        res.json({
            success: true,
            count: todos.length,
            data: todos
        });
    } catch (error) {
        console.error("Error al obtener usuarios/visitantes:", error);
        res.status(500).json({ 
            error: "Error al obtener los usuarios y visitantes",
            detalles: error.message
        });
    }
};

// Obtener usuario por ID
exports.obtenerUsuarioPorId = async (req, res) => {
    try {
        if (req.params.id === "admin") {
            return res.json(ADMIN_INFO);
        }

        const usuario = await Usuario.findById(req.params.id);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json(usuario);
    } catch (error) {
        console.error("Error al obtener usuario:", error);
        res.status(500).json({ 
            error: "Error al obtener el usuario",
            detalles: error.message
        });
    }
};

// Actualizar usuario
exports.actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = { ...req.body };

    Object.keys(datos).forEach(key => {
      if (datos[key] === undefined || datos[key] === "") {
        delete datos[key];
      }
    });

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      id,
      { $set: datos },
      { new: true, runValidators: true }
    );

    if (!usuarioActualizado) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      mensaje: "Usuario actualizado correctamente",
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error al actualizar el usuario.", detalles: error.message });
  }
};

// Eliminar usuario o visitante
exports.eliminarUsuario = async (req, res) => {
    try {
        const Visitante = require("../config/models/visitante");
        const { id, tipo } = req.params;

        if (id === "admin") {
            return res.status(400).json({ error: "No puedes eliminar al administrador" });
        }

        let eliminado;

        if (tipo === "visitante") {
            eliminado = await Visitante.findByIdAndDelete(id);
        } else {
            eliminado = await Usuario.findByIdAndDelete(id);
        }

        if (!eliminado) {
            return res.status(404).json({ error: "No encontrado" });
        }

        res.json({ mensaje: "Eliminado exitosamente", eliminado });
    } catch (error) {
        console.error("Error al eliminar usuario/visitante:", error);
        res.status(500).json({ 
            error: "Error al eliminar",
            detalles: error.message
        });
    }
};
