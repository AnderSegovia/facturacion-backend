import express from 'express';
import Cliente from '../models/Cliente.js';
import Factura from '../models/Factura.js';

const router = express.Router();

// Read
router.get('/', async (req, res) => {
  try {
    const { nombre, tipo, documento, telefono, estado } = req.query;
    const filtro = {};
    
    if (nombre) {
      filtro.nombre = { $regex: nombre, $options: 'i' }; 
    }

    if (tipo) {
      filtro.tipo = tipo;
    }

    if (documento) {
      filtro.$or = [
        { dui: { $regex: documento, $options: 'i' } },
        { nrc: { $regex: documento, $options: 'i' } },
      ];
    }

    if (telefono) {
      filtro.telefono = { $regex: telefono, $options: 'i' };
    }

    if (estado) {
      filtro.estado = estado;
    }

    const clientes = await Cliente.find(filtro).sort({ nombre: 1 });

    res.json(clientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener clientes' });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const nuevo = new Cliente(req.body);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtener detalles
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