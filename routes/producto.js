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

export default router;
