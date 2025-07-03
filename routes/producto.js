import express from 'express';
import Producto from '../models/Producto.js';
import Factura from '../models/Factura.js';


const router = express.Router();

// GET /api/productos
router.get('/', async (req, res) => {
  const { nombre, categoria, marca, modelo, sku, ubicacion } = req.query;
  const filtro = {};

  if (nombre) filtro.nombre = new RegExp(nombre, 'i');
  if (categoria) filtro.categoria = new RegExp(categoria, 'i');
  if (marca) filtro.marca = new RegExp(marca, 'i');
  if (modelo) filtro.modelo = new RegExp(modelo, 'i');
  if (sku) filtro.sku = new RegExp(sku, 'i');
  if (ubicacion) filtro.ubicacion = new RegExp(ubicacion, 'i');

  const productos = await Producto.find(filtro);
  res.json(productos);
});

// Create
router.post('/', async (req, res) => {
  try {
    const nuevo = new Producto(req.body);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//Read
router.get('/:id', async (req, res) => {
  try {
    const productoId = req.params.id;

    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    const facturas = await Factura.find({ 'detalles.producto': productoId })
      .populate('cliente', 'nombre') 
      .select('-__v'); 

    res.json({ producto, facturas });

  } catch (error) {
    console.error('Error al obtener producto y facturas:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

export default router;