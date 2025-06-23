import mongoose from 'mongoose';

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  categoria: { type: String }, // ej: "Luces", "Cascos"
  marca: String,
  modelo: String,
  sku: String, // Código interno o código de barra
  precio_unitario: { type: Number, required: true },
  precio_venta: Number, // precio con IVA si aplica
  stock: { type: Number, default: 0 },
  ubicacion: String, // ej: "Bodega A - Estante 3"
  fecha_ingreso: { type: Date, default: Date.now },
  estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' }
});

productoSchema.pre('save', function (next) {
  this.precio_venta = parseFloat((this.precio_unitario * 1.13).toFixed(2));
  next();
});

export default mongoose.model('Producto', productoSchema);
