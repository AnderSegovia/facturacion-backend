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

export default router;