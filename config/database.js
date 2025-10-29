const mongoose = require('mongoose');

const conectarDB = async () => {
  try {
    let uri;

    if (process.env.NODE_ENV === 'production') {
      // ☁️ Producción (Azure)
      uri = process.env.MONGO_URI;
      if (!uri) {
        throw new Error('⚠️ Variable MONGO_URI no configurada en el entorno de producción.');
      }
    } else {
      // 💻 Desarrollo local
      uri = 'mongodb://localhost:27017/adminResidencial';
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(
      `✅ Conectado a MongoDB en: ${
        uri.includes('localhost') ? 'Localhost' : 'MongoDB Atlas'
      }`
    );
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = conectarDB;
