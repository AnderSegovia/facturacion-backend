import express from 'express';
import Factura from '../models/Factura.js';
import Producto from '../models/Producto.js';

const router = express.Router();

// Crear factura
router.post('/', async (req, res) => {
  try {
    const { cliente, tipo_documento, detalles } = req.body;

    let totalSinIva = 0;
    let totalIva = 0;

    // Calcular totales
    const detallesCalculados = await Promise.all(
      detalles.map(async (item) => {
        const producto = await Producto.findById(item.producto);
        const precio = producto.precio_unitario;
        const cantidad = item.cantidad;

        const subtotal = precio * cantidad;
        const iva = subtotal * 0.13;
        const total = subtotal + iva;

        totalSinIva += subtotal;
        totalIva += iva;

        return {
          producto: producto._id,
          descripcion: producto.nombre,
          cantidad,
          precio_unitario: precio,
          subtotal,
          iva,
          total
        };
      })
    );

    const nuevaFactura = new Factura({
      cliente,
      tipo_documento,
      detalles: detallesCalculados,
      total_sin_iva: totalSinIva,
      total_iva: totalIva,
      total_con_iva: totalSinIva + totalIva
    });

    await nuevaFactura.save();

    res.status(201).json(nuevaFactura);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtener todas las facturas
router.get('/', async (req, res) => {
  const facturas = await Factura.find().populate('cliente').populate('detalles.producto');
  res.json(facturas);
});

export default router;
