import express from 'express';
import FacturaCompra from '../models/FacturaCompra.js';
import Producto from '../models/Producto.js';
import Proveedor from '../models/Proveedor.js';

const router = express.Router();

// Create
router.post('/', async (req, res) => {
  try {
    const {
      proveedor,
      numero_factura,
      tipo_factura,
      forma_pago,
      fecha_vencimiento,
      detalles,
      observaciones
    } = req.body;

    if (!proveedor || !numero_factura || !tipo_factura || !forma_pago || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ mensaje: 'Campos requeridos faltantes.' });
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
      numero_factura,
      tipo_factura,
      forma_pago,
      fecha_vencimiento: forma_pago === 'Crédito' ? fecha_vencimiento : null,
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

// Read
router.get('/', async (req, res) => {
  try {
    const { proveedor, desde, hasta, numero_factura, tipo_factura, forma_pago } = req.query;
    const filtro = {};
    if (proveedor) {
      const proveedores = await Proveedor.find({
        nombre: { $regex: proveedor, $options: 'i' },
      }).select('_id');

      if (proveedores.length > 0) {
        filtro.proveedor = { $in: proveedores.map((p) => p._id) };
      } else {
        return res.json([]); 
      }
    }
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
    if (numero_factura) { filtro.numero_factura = { $regex: numero_factura, $options: 'i' };}
    if (tipo_factura) {filtro.tipo_factura = tipo_factura;}
    if (forma_pago) { filtro.forma_pago = forma_pago;}

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

//Ver detalles
router.get('/:id', async (req, res) => {
  try {
    const factura = await FacturaCompra.findById(req.params.id)
      .populate('proveedor', 'nombre')
      .populate('detalles.producto', 'nombre sku');
    
    if (!factura) return res.status(404).json({ mensaje: 'Factura no encontrada' });

    res.json(factura);
  } catch (error) {
    console.error('Error al obtener factura:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});


export default router;