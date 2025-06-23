import express from 'express';
import Cliente from '../models/Cliente.js';

const router = express.Router();

// Obtener todos los clientes
router.get('/', async (req, res) => {
  const clientes = await Cliente.find();
  res.json(clientes);
});

// Agregar nuevo cliente
router.post('/', async (req, res) => {
  try {
    const nuevo = new Cliente(req.body);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
