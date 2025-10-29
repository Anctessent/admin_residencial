const express = require("express");
const router = express.Router();

const Visitante = require("../config/models/visitante");
const Parqueadero = require("../config/models/parqueadero");

// =======================================================
// 📌 Registrar visitante (con asignación automática de plaza)
// =======================================================
router.post("/", async (req, res) => {
    try {
        const { nombreVisitante, apellidoVisitante, cedulaVisitante, placaVisitante, residenteId } = req.body;

        // 👇 Aquí sí puedes usar await porque estamos dentro de async
        const visitanteExistente = await Visitante.findOne({ cedula: cedulaVisitante });
        if (visitanteExistente) {
            return res.status(400).json({ mensaje: "El visitante ya está registrado" });
        }

        let idResidente = residenteId === "admin" ? null : residenteId;

        const plaza = await Parqueadero.findOne({ estado: "DISPONIBLE" });
        if (!plaza) return res.status(400).json({ mensaje: "No hay plazas disponibles" });

        const nuevoVisitante = new Visitante({
            nombre: nombreVisitante,
            apellido: apellidoVisitante,
            cedula: cedulaVisitante,
            placaVehiculo: placaVisitante || null,
            residenteId: idResidente,
            parqueadero: plaza._id
        });

        await nuevoVisitante.save();

        plaza.estado = "OCUPADO";
        plaza.visitante = nuevoVisitante._id;
        await plaza.save();

        res.status(201).json({ visitante: nuevoVisitante, plaza });
    } catch (error) {
        console.error("Error al registrar visitante:", error);
        res.status(500).json({ mensaje: "Error al registrar visitante", error: error.message });
    }
});



// =======================================================
// 📌 Obtener todos los visitantes
// =======================================================
router.get("/", async (req, res) => {
    try {
        const visitantes = await Visitante.find()
            .populate("residenteId", "nombre cedula")
            .populate("parqueadero", "numero estado");
        res.json(visitantes);
    } catch (error) {
        console.error("Error al obtener visitantes:", error);
        res.status(500).json({ mensaje: "Error al obtener visitantes" });
    }
});

// =======================================================
// 📌 Obtener visitantes de un residente
// =======================================================
router.get("/misVisitantes/:residenteId", async (req, res) => {
    try {
        const { residenteId } = req.params;
        const visitantes = await Visitante.find({ residenteId })
            .populate("parqueadero", "numero estado");
        res.json(visitantes);
    } catch (error) {
        console.error("Error al obtener visitantes del residente:", error);
        res.status(500).json({ mensaje: "Error al obtener visitantes" });
    }
});

// =======================================================
// 📌 Eliminar visitante y liberar plaza
// =======================================================
router.delete("/:visitanteId", async (req, res) => {
    try {
        const { visitanteId } = req.params;

        const visitante = await Visitante.findById(visitanteId);
        if (!visitante) {
            return res.status(404).json({ mensaje: "Visitante no encontrado" });
        }

        // liberar plaza si estaba ocupada
        if (visitante.parqueadero) {
            const plaza = await Parqueadero.findById(visitante.parqueadero);
            if (plaza) {
                plaza.estado = "DISPONIBLE";
                plaza.visitante = null;
                await plaza.save();
            }
        }

        await visitante.deleteOne();

        res.status(200).json({ mensaje: "✅ Visitante eliminado y plaza liberada" });
    } catch (error) {
        console.error("Error al eliminar visitante:", error);
        res.status(500).json({ mensaje: "Error al eliminar visitante" });
    }
});

// =======================================================
// 📌 Ver todas las plazas con visitantes
// =======================================================
router.get("/parqueaderos", async (req, res) => {
    try {
        const plazas = await Parqueadero.find().populate("visitante");
        res.json(plazas);
    } catch (error) {
        console.error("Error al obtener plazas:", error);
        res.status(500).json({ mensaje: "Error al obtener plazas" });
    }
});

// =======================================================
// 📌 Editar visitante y actualizar plaza
// =======================================================
router.put("/editarVisitante/:visitanteId", async (req, res) => {
    try {
        const { visitanteId } = req.params;
        const { nombre, apellido, cedula, placaVehiculo } = req.body;

        const visitante = await Visitante.findById(visitanteId);
        if (!visitante) {
            return res.status(404).json({ mensaje: "Visitante no encontrado" });
        }

        visitante.nombre = nombre;
        visitante.apellido = apellido;
        visitante.cedula = cedula;
        visitante.placaVehiculo = placaVehiculo;

        await visitante.save();

        const visitanteActualizado = await Visitante.findById(visitanteId)
            .populate("parqueadero", "numero estado");

        res.json({ mensaje: "Visitante actualizado con éxito", visitante: visitanteActualizado });
    } catch (error) {
        console.error("Error al actualizar visitante:", error);
        res.status(500).json({ mensaje: "Error al actualizar visitante" });
    }
});

module.exports = router;
