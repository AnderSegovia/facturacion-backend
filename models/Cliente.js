import mongoose from 'mongoose';

const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  tipo: { type: String, enum: ['Consumidor Final', 'Contribuyente'], required: true },
  dui: { type: String },
  nrc: { type: String }, // solo empresas
  giro: String, // actividad económica
  direccion: String,
  telefono: String,
  correo: String,
  distrito: String,
  estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' },
  fecha_creacion: { type: Date, default: Date.now }
});

export default mongoose.model('Cliente', clienteSchema);
