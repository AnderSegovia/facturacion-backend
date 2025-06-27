import mongoose from 'mongoose';

const detalleSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  descripcion: String,
  cantidad: Number,
  precio_unitario: Number,
  precio_venta: Number,
  subtotal: Number,
  iva: Number,
  total: Number
});

const facturaSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  tipo_documento: { type: String, enum: ['Ticket', 'Credito Fiscal'], required: true },
  fecha: { type: Date, default: Date.now },
  detalles: [detalleSchema],
  total_sin_iva: Number,
  total_iva: Number,
  total_con_iva: Number,
  estado: { type: String, enum: ['activo', 'anulado'], default: 'activo' }
});

export default mongoose.model('Factura', facturaSchema);
