import express from 'express';
import Proveedor from '../models/Proveedor.js';

const router = express.Router();

// Create
router.post('/', async (req, res) => {
  try {
    const nuevoProveedor = new Proveedor(req.body);
    await nuevoProveedor.save();
    res.status(201).json(nuevoProveedor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Read
router.get('/', async (req, res) => {
  try {
    const { nombre, estado } = req.query;
    const filtro = {};
    
    if (nombre) {filtro.nombre = { $regex: nombre, $options: 'i' }; }

    if (estado) {filtro.estado = estado;}

    const proveedores = await Proveedor.find(filtro).sort({ nombre: 1 });
    res.json(proveedores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener clientes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const proveedor = await Proveedor.findById(req.params.id);

    if (!proveedor) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }

    res.json(proveedor);
  } catch (error) {
    console.error('Error al obtener proveedor por ID:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

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