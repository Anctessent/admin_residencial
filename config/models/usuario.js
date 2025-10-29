const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    cedula: { type: String, required: true, unique: true },

    apartamento: { 
        type: String, 
        required: function () { return this.rol === "residente"; } 
    },
    torre: { 
        type: String, 
        required: function () { return this.rol === "residente"; } 
    },

    fechaIngreso: { type: Date },
    fechaRetiro: { type: Date },

    estadoExpensa: { 
        type: String, 
        enum: ["al dia", "en mora", "no aplica"], 
        default: function () { 
            return this.rol === "residente" ? "al dia" : "no aplica"; 
        },
        required: function () { return this.rol === "residente"; }
    },

    tieneVehiculo: { type: Boolean, default: false },
    placaVehiculo: { type: String },
    placa2Vehiculo: { type: String },

    password: { type: String, required: true },

    rol: { 
        type: String, 
        enum: ["admin", "residente", "porteria", "visitante"], 
        default: "residente" 
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Usuario", usuarioSchema);
