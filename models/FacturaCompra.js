import mongoose from 'mongoose';

const detalleSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  cantidad: { type: Number, required: true, min: 1 },
  precio_unitario: { type: Number, required: true, min: 0 },
  iva: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }
}, { _id: false });

const facturaCompraSchema = new mongoose.Schema({
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor', required: true },
  fecha: { type: Date, default: Date.now },
  detalles: [detalleSchema],
  total_sin_iva: { type: Number, required: true },
  total_iva: { type: Number, required: true },
  total_con_iva: { type: Number, required: true },
  observaciones: { type: String }
}, { timestamps: true });

export default mongoose.model('FacturaCompra', facturaCompraSchema);
