import express from 'express';
import Cliente from '../models/Cliente.js';
import Factura from '../models/Factura.js';


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
// GET /clientes/:id - Obtener los detalles de un cliente
router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

    const facturas = await Factura.find({ cliente: cliente._id });

    res.json({ cliente, facturas });
  } catch (error) {
    console.error('Error al obtener cliente y facturas:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});


export default router;
