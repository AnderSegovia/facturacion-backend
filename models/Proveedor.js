import mongoose from 'mongoose';

const proveedorSchema = new mongoose.Schema({
  nombre: {type: String, required: true, trim: true,},
  telefono: { type: String, required: true, },
  direccion: { type: String, required: true, },
  email: { type: String, trim: true, lowercase: true, },
  nrc: { type: String, required: true, unique: true, },
  contacto: { type: String, },
  estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo', },
  fecha_creado: { type: Date, default: Date.now, }
});

export default mongoose.model('Proveedor', proveedorSchema);
