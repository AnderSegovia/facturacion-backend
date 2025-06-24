import express from 'express';
import Producto from '../models/Producto.js';

const router = express.Router();

// GET /api/productos
router.get('/', async (req, res) => {
  const productos = await Producto.find();
  res.json(productos);
});

// POST /api/productos
router.post('/', async (req, res) => {
  try {
    const nuevo = new Producto(req.body);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//Ver detalle
router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

export default router;