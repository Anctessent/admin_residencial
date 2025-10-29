require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const conectarDB = require('./config/database');
const usuarioRoutes = require('./routes/usuario.routes');
const visitanteRoutes = require('./routes/visitante.routes');
const parqueaderoRoutes = require('./routes/parqueadero.routes');
const Usuario = require('./config/models/usuario');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 5000;

/* =========================
   🔐 Seguridad Middleware
========================= */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",     // Chart.js, Bootstrap
          "https://cdnjs.cloudflare.com", // Font Awesome, librerías
          "https://unpkg.com"             // Alternativas
        ],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com", // ✅ Agregado para Font Awesome
          "https://fonts.googleapis.com"
        ],
        "font-src": [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com", // ✅ Agregado para Font Awesome (woff / woff2)
          "data:"
        ],
        "img-src": ["'self'", "data:", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        "connect-src": ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        "script-src-attr": ["'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// 2. CORS -> Permitir origen local o desde tu frontend
app.use(cors());

// 3. Limitar peticiones
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: "Demasiadas peticiones desde esta IP, intenta más tarde.",
});
app.use(limiter);

// 4. Sanitizar contra NoSQL Injection
app.use(mongoSanitize());

// 5. Sanitizar contra XSS
app.use(xss());

// 6. Parseo de JSON
app.use(express.json({ limit: "10kb" }));

/* =========================
   📌 Conexión a BD + Admin
========================= */
(async () => {
  try {
    await conectarDB();
    console.log("✅ Conectado a MongoDB");
    await crearAdminSiNoExiste();
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err);
  }
})();

/* =========================
   📌 Rutas API
========================= */
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/visitantes', visitanteRoutes);
app.use('/api/parqueaderos', parqueaderoRoutes);

app.get('/api/test', (req, res) => {
  res.json({
    mensaje: "✅ Conexión exitosa con el servidor Node.js",
    estado: "OK",
    fecha: new Date(),
  });
});

/* =========================
   📌 Archivos estáticos (Frontend)
========================= */
app.use(express.static(path.join(__dirname, 'Vista')));

/* =========================
   📌 Rutas de vistas
========================= */
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'Vista', 'Vista.html'))
);
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'Vista', 'Vistaadmin.html'))
);
app.get('/residente', (req, res) =>
  res.sendFile(path.join(__dirname, 'Vista', 'Vistaresidente.html'))
);
app.get('/porteria', (req, res) =>
  res.sendFile(path.join(__dirname, 'Vista', 'Vistaporteria.html'))
);
app.get('/porteriaactualizar', (req, res) =>
  res.sendFile(path.join(__dirname, 'Vista', 'Vistaporteriaactualizar.html'))
);
app.get('/porteriaregistrar', (req, res) =>
  res.sendFile(path.join(__dirname, 'Vista', 'Vistaporteriaregistrar.html'))
);
app.get('/mapa', (req, res) =>
  res.sendFile(path.join(__dirname, 'Vista', 'mapa.html'))
);

/* =========================
   📌 Crear usuario admin si no existe
========================= */
async function crearAdminSiNoExiste() {
  try {
    const adminExistente = await Usuario.findOne({ cedula: "123456789" });
    if (!adminExistente) {
      const hashedPassword = await bcrypt.hash("admin123", 12);
      const nuevoAdmin = new Usuario({
        nombre: "Admin",
        apellido: "Principal",
        cedula: "123456789",
        apartamento: "N/A",
        torre: "N/A",
        password: hashedPassword,
        rol: "admin",
      });
      await nuevoAdmin.save();
      console.log("✅ Usuario administrador creado con éxito");
    } else {
      console.log("👤 Usuario administrador ya existe");
    }
  } catch (error) {
    console.error("❌ Error al crear el usuario administrador:", error);
  }
}

/* =========================
   🚀 Iniciar servidor
========================= */
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
