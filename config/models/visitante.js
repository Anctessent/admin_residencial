const mongoose = require('mongoose');
const Parqueadero = require('./parqueadero');

const visitanteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  cedula: { type: String, required: true, unique: true },
  placaVehiculo: { type: String, required: false }, // ✅ ya no es obligatorio
  residenteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Usuario", 
    required: false,
    default: null 
  }, 
  parqueadero: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Parqueadero", 
    default: null 
  }
}, {
  timestamps: true
});

// Middleware: liberar plaza al eliminar
visitanteSchema.pre("deleteOne", { document: true, query: false }, async function(next) {
  if (this.parqueadero) {
    try {
      const plaza = await Parqueadero.findById(this.parqueadero);
      if (plaza) {
        plaza.estado = "DISPONIBLE";
        plaza.visitante = null;
        await plaza.save();
      }
      next();
    } catch (error) {
      console.error("Error liberando la plaza del visitante eliminado:", error);
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Visitante", visitanteSchema, "visitantes");
