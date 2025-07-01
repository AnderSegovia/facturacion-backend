import express from 'express';
import Factura from '../models/Factura.js';
import Cliente from '../models/Cliente.js';
import Producto from '../models/Producto.js';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/resumen', async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // Ventas de hoy
    const ventasHoyAgg = await Factura.aggregate([
      { $match: { fecha: { $gte: hoy, $lt: mañana }, estado: 'activo' } },
      { $group: { _id: null, total: { $sum: "$total_con_iva" } } }
    ]);
    const ventasHoysub = ventasHoyAgg[0]?.total || 0;
    const ventasHoy = ventasHoysub.toFixed(2);

    // Ventas del mes
    const ventasMesAgg = await Factura.aggregate([
      { $match: { fecha: { $gte: inicioMes }, estado: 'activo' } },
      { $group: { _id: null, total: { $sum: "$total_con_iva" } } }
    ]);
    const ventasMessub = ventasMesAgg[0]?.total || 0;
    const ventasMes = ventasMessub.toFixed(2);


    // Total facturas activas
    const facturas = await Factura.countDocuments({ estado: 'activo' });

    // Clientes activos
    const clientes = await Cliente.countDocuments({ estado: 'activo' });

    // Ventas por día (últimos 7 días)
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 6);
    hace7Dias.setHours(0, 0, 0, 0);

    const ventasDiariasRaw = await Factura.aggregate([
      {
        $match: {
          fecha: { $gte: hace7Dias },
          estado: 'activo'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$fecha" }
          },
          total: { $sum: "$total_con_iva" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dias = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const ventasDiarias = dias.map((fecha) => {
      const venta = ventasDiariasRaw.find(v => v._id === fecha);
      return {
        fecha: new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short' }),
        total: venta?.total || 0
      };
    });

    // Productos más vendidos
    const productosTop = await Factura.aggregate([
      { $unwind: "$detalles" },
      {
        $group: {
          _id: "$detalles.producto",
          cantidad: { $sum: "$detalles.cantidad" }
        }
      },
      { $sort: { cantidad: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "productos",
          localField: "_id",
          foreignField: "_id",
          as: "producto"
        }
      },
      { $unwind: "$producto" },
      {
        $project: {
          nombre: "$producto.nombre",
          cantidad: 1
        }
      }
    ]);

    // Clientes más frecuentes
    const clientesTop = await Factura.aggregate([
      {
        $group: {
          _id: "$cliente",
          compras: { $sum: 1 }
        }
      },
      { $sort: { compras: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "clientes",
          localField: "_id",
          foreignField: "_id",
          as: "cliente"
        }
      },
      { $unwind: "$cliente" },
      {
        $project: {
          nombre: "$cliente.nombre",
          compras: 1
        }
      }
    ]);
    // Productos con bajo stock
    const stockBajo = await Producto.find({ stock: { $lt: 5 } })
      .select('nombre')
      .select('stock')
      .lean();


    res.json({
      resumen: { ventasHoy, ventasMes, facturas, clientes },
      ventasDiarias,
      productosTop,
      clientesTop,
      stockBajo
    });

  } catch (error) {
    console.error('Error en resumen dashboard:', error);
    res.status(500).json({ error: 'Error al obtener el resumen del dashboard' });
  }
});

export default router;
