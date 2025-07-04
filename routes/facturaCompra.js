import express from 'express';
import FacturaCompra from '../models/FacturaCompra.js';
import Producto from '../models/Producto.js';

const router = express.Router();

// Read
router.get('/', async (req, res) => {
  try {
    const { proveedor, desde, hasta } = req.query;
    const filtro = {};

    // Filtro por proveedor con validación
    if (proveedor) {
      const proveedores = await Proveedor.find({
        nombre: { $regex: proveedor, $options: 'i' },
      }).select('_id');

      if (proveedores.length > 0) {
        filtro.proveedor = { $in: proveedores.map((p) => p._id) };
      } else {
        return res.json([]); // No coincidencias = no resultados
      }
    }

    // Filtro por fecha con validación
    if (desde && !isNaN(new Date(desde))) {
      filtro.fecha = filtro.fecha || {};
      filtro.fecha.$gte = new Date(desde);
    }
    if (hasta && !isNaN(new Date(hasta))) {
      const fechaHasta = new Date(hasta);
      fechaHasta.setHours(23, 59, 59, 999);
      filtro.fecha = filtro.fecha || {};
      filtro.fecha.$lte = fechaHasta;
    }

    const facturas = await FacturaCompra.find(filtro)
      .populate('proveedor', 'nombre')
      .populate('detalles.producto', 'nombre sku')
      .sort({ fecha: -1 });

    res.json(facturas);
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ mensaje: 'Error al obtener historial de compras' });
  }
});

// Look for
router.get('/sku/:sku', async (req, res) => {
  const producto = await Producto.findOne({ sku: req.params.sku });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

// Update Stock
router.put('/:id/stock', async (req, res) => {
  const { stock } = req.body;
  const producto = await Producto.findByIdAndUpdate(req.params.id, { stock }, { new: true });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

// Create
router.post('/', async (req, res) => {
  try {
    const { proveedor, detalles, observaciones } = req.body;

    if (!proveedor || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ mensaje: 'Proveedor y detalles son requeridos.' });
    }

    let totalSinIva = 0;
    let totalIva = 0;
    let totalConIva = 0;

    for (const item of detalles) {
      totalSinIva += item.precio_unitario * item.cantidad;
      totalIva += item.iva;
      totalConIva += item.total;

      const producto = await Producto.findById(item.producto);
      if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

      producto.stock += item.cantidad;
      await producto.save();
    }

    const nuevaFactura = new FacturaCompra({
      proveedor,
      detalles,
      total_sin_iva: totalSinIva,
      total_iva: totalIva,
      total_con_iva: totalConIva,
      observaciones
    });

    await nuevaFactura.save();

    res.status(201).json({ mensaje: 'Factura registrada correctamente', factura: nuevaFactura });
  } catch (error) {
    console.error('Error al guardar factura de compra:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

export default router;