import express from 'express';
import Factura from '../models/Factura.js';
import Producto from '../models/Producto.js';
import Cliente from '../models/Cliente.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import mongoose from 'mongoose';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear factura
router.post('/', async (req, res) => {
  try {
    const { cliente, tipo_documento, detalles } = req.body;

    let totalSinIva = 0;
    let totalIva = 0;

    const detallesCalculados = await Promise.all(
      detalles.map(async (item) => {
        const producto = await Producto.findById(item.producto);
        if (!producto) throw new Error(`Producto no encontrado: ${item.producto}`);

        const precio = producto.precio_venta;
        const cantidad = item.cantidad;

        // Validación: verificar stock disponible
        if (producto.stock < cantidad) {
          throw new Error(`Stock insuficiente para el producto: ${producto.nombre}`);
        }

        const subtotal = precio * cantidad;
        const iva = subtotal * 0.13;
        const total = subtotal + iva;

        totalSinIva += subtotal;
        totalIva += iva;

        return {
          producto: producto._id,
          descripcion: producto.nombre,
          cantidad,
          precio_unitario: precio,
          subtotal,
          iva,
          total
        };
      })
    );

    const nuevaFactura = new Factura({
      cliente,
      tipo_documento,
      detalles: detallesCalculados,
      total_sin_iva: totalSinIva,
      total_iva: totalIva,
      total_con_iva: totalSinIva + totalIva
    });

    await nuevaFactura.save();

    // 🟡 Descontar stock después de guardar la factura
    await Promise.all(
      detallesCalculados.map(async (item) => {
        await Producto.findByIdAndUpdate(item.producto, {
          $inc: { stock: -item.cantidad }
        });
      })
    );

    res.status(201).json(nuevaFactura);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Obtener todas las facturas
router.get('/', async (req, res) => {
  try {
    const { desde, hasta, numero, cliente, tipo, fecha, estado } = req.query;

    const query = {};

    if (numero) {
      if (mongoose.Types.ObjectId.isValid(numero) && numero.length === 24) {
        query._id = numero;
      }
    }

    if (cliente) {
      const clientes = await Cliente.find({
        nombre: { $regex: cliente, $options: 'i' }
      }).select('_id');
      query.cliente = { $in: clientes.map(c => c._id) };
    }

    if (tipo) {
      query.tipo_documento = tipo;
    }

    if (desde && hasta) {
      const fechaInicio = new Date(`${desde}T00:00:00`);
      const fechaFin = new Date(`${hasta}T23:59:59.999`);
      query.fecha = { $gte: fechaInicio, $lte: fechaFin };
    } else if (desde) {
      const fechaInicio = new Date(`${desde}T00:00:00`);
      query.fecha = { $gte: fechaInicio };
    } else if (hasta) {
      const fechaFin = new Date(`${hasta}T23:59:59.999`);
      query.fecha = { $lte: fechaFin };
    }

    if (estado) {
      query.estado = estado;
    }

    const facturas = await Factura.find(query)
      .populate('cliente')
      .sort({ fecha: -1 });

    res.json(facturas);
  } catch (error) {
    console.error('Error obteniendo facturas:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener facturas' });
  }
});
      

//Ver detalles de facturas
router.get('/:id', async (req, res) => {
  try {
    const factura = await Factura.findById(req.params.id)
      .populate('cliente') // llena los datos del cliente
      .populate('detalles.producto'); // llena los productos si quieres mostrar el nombre, etc.

    if (!factura) {
      return res.status(404).json({ mensaje: 'Factura no encontrada' });
    }

    res.json(factura);
  } catch (error) {
    console.error('Error al obtener factura:', error);
    res.status(500).json({ mensaje: 'Error del servidor al obtener la factura' });
  }
});

function calcularAlturaTicket(factura) {
  const base = 250; 
  const linea = 20; 
  const totalLineas = factura.detalles.length * linea;

  const extra = 270;

  return base + totalLineas + extra;
}

//Generar pdf de factura 
router.get('/:id/pdf', async (req, res) => {
  try {
    const factura = await Factura.findById(req.params.id)
      .populate('cliente')
      .populate('detalles.producto');

    if (!factura) return res.status(404).json({ mensaje: 'Factura no encontrada' });

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const logoPath = path.join(__dirname, '../assets/logoo.png');

    res.setHeader('Content-disposition', 'inline; filename=factura-dte.pdf');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // === Encabezado de la Empresa ===
    doc.image(logoPath, 40, 40, { width: 80 });
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('OneDevAnd S.A. DE C.V.', 140, 40)
      .font('Helvetica')
      .fontSize(10)
      .text('Giro: Desarrollo de Software', 140, 55)
      .text('NIT: 0614-123456-001-1', 140, 70)
      .text('NRC: 123456-7', 140, 85)
      .text('Resolución: 123-RES-2024', 140, 100)
      .text('Dirección: Av. Empresarial #123, San Miguel', 140, 115)
      .text('Tel: (503) 2222-0000 | Email: info@OneDevAnd.com', 140, 130);

    // === Encabezado del Documento ===
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('FACTURA', 0, 160, { align: 'center' });

    const fecha = new Date(factura.fecha);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Número de Documento: FEX-${factura.numero || factura._id}`, 400, 40)
      .text(`Fecha de emisión: ${fecha.toLocaleDateString()}`, 400, 65)
      .text(`Hora: ${fecha.toLocaleTimeString()}`, 400, 75);

    // === Datos del Cliente ===
    doc
      .fontSize(11)
      .text('CLIENTE:', 40, 180)
      .text(`Nombre: ${factura.cliente.nombre}`, 60)
      .text(`NIT/DUI: ${factura.cliente.nrc || 'CF'}`)
      .text(`Dirección: ${factura.cliente.direccion || 'No registrada'}`)
      .moveDown();

    // === Tabla de Detalles ===
    const tableTop = doc.y + 10;
    const columns = {
      cant: 40,
      desc: 90,
      unit: 330,
      iva: 400,
      total: 470,
    };

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Cant.', columns.cant, tableTop)
      .text('Descripción', columns.desc, tableTop)
      .text('P/U', columns.unit, tableTop)
      .text('IVA', columns.iva, tableTop)
      .text('Total', columns.total, tableTop)
      .moveDown(0.5);

    doc.font('Helvetica');

    factura.detalles.forEach((detalle) => {
      const y = doc.y;
      doc
        .fontSize(9)
        .text(detalle.cantidad, columns.cant, y)
        .text(detalle.descripcion || detalle.producto.nombre, columns.desc, y, { width: 220 })
        .text(`$${detalle.precio_unitario?.toFixed(2)}`, columns.unit, y)
        .text(`$${detalle.iva?.toFixed(2)}`, columns.iva, y)
        .text(`$${(detalle.cantidad*detalle.precio_unitario)?.toFixed(2)}`, columns.total, y)
        .moveDown(0.5);
    });

    // === Totales ===
    const yTotal = doc.y + 15;
    doc
      .fontSize(10)
      .text('SUBTOTAL:', 400, yTotal)
      .text(`$${factura.total_sin_iva.toFixed(2)}`, 500, yTotal, { align: 'right' })

      .text('IVA (13%):', 400, yTotal + 15)
      .text(`$${factura.total_iva.toFixed(2)}`, 500, yTotal + 15, { align: 'right' })

      .font('Helvetica-Bold')
      .text('TOTAL A PAGAR:', 400, yTotal + 30)
      .text(`$${factura.total_con_iva.toFixed(2)}`, 500, yTotal + 30, { align: 'right' });

    // === Simulación de CUFE y Firma ===
    const cufe = `CUFE-${factura._id.toString().substring(0, 8)}-${fecha.getTime()}`;
    doc
      .font('Courier')
      .fontSize(9)
      .text(`CUFE: ${cufe}`, 40, yTotal + 60)
      .text('Documento firmado electrónicamente por:', 40, yTotal + 75)
      .text('OneDevAnd S.A. DE C.V.', 60, yTotal + 90)
      .text('FIRMA DIGITAL: JXKA-1923-AJS82-0182-ASX2', 60, yTotal + 105);

    // === Código QR (con datos ficticios) ===
    const qrData = `Factura: FEX-${factura.numero || factura._id}\nFecha: ${fecha.toLocaleDateString()}\nCUFE: ${cufe}\nTotal: $${factura.total_con_iva.toFixed(2)}`;

    const qrImageBuffer = await QRCode.toBuffer(qrData, { type: 'png' });
    doc.image(qrImageBuffer, 420, yTotal + 60, { width: 100 });

    // === Frase legal ===
    doc
      .fontSize(9)
      .font('Helvetica')
      .text('Este documento es válido conforme a la normativa de facturación electrónica en El Salvador.', 40, 740, {
        align: 'center',
        width: 520,
      });

    doc.end();
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ mensaje: 'Error generando PDF de factura' });
  }
});

//Generar ticket de factura
router.get('/:id/ticket', async (req, res) => {
  try {
    const factura = await Factura.findById(req.params.id)
      .populate('cliente')
      .populate('detalles.producto');

    if (!factura) return res.status(404).json({ mensaje: 'Factura no encontrada' });

    const altura = calcularAlturaTicket(factura);

    const doc = new PDFDocument({ size: [227, altura], margin: 10 });
    const logoPath = path.join(__dirname, '../assets/logoo.png');

    res.setHeader('Content-disposition', 'inline; filename=ticket-factura.pdf');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // === Logo y encabezado empresa ===
    const logoWidth = 80;
    const logoHeight = 60; // ajusta según tu imagen
    const centerLogoX = (doc.page.width - logoWidth) / 2;

    doc.image(logoPath, centerLogoX, doc.y, { width: logoWidth });

    // Aumenta manualmente la altura para que el texto no se monte
    doc.y += logoHeight + 20;


    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('OneDevAnd S.A. DE C.V.', { align: 'center' })
      .font('Helvetica')
      .text('NIT: 0614-123456-001-1', { align: 'center' })
      .text('NRC: 123456-7', { align: 'center' })
      .text('Tel: 2222-0000', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('FACTURA', { align: 'center' })
      .moveDown();

    const fecha = new Date(factura.fecha);

    doc
      .font('Helvetica')
      .fontSize(9)
      .text(`Fecha: ${fecha.toLocaleDateString()}`, { align: 'center' })
      .text(`Hora: ${fecha.toLocaleTimeString()}`, { align: 'center' })
      .text(`N° Doc: FEX-${factura.numero || factura._id}`, { align: 'center' })
      .moveDown();

    // === Cliente ===
    doc
      .font('Helvetica-Bold').text('CLIENTE:', { align: 'left' })
      .font('Helvetica')
      .fontSize(9)
      .text(`Nombre: ${factura.cliente.nombre}`)
      .text(`NIT/DUI: ${factura.cliente.nrc || factura.cliente.dui || 'CF'}`)
      .moveDown();

    // === Detalles productos ===
    doc.font('Helvetica-Bold').text('DETALLE:', { align: 'left' });
    doc.font('Helvetica').fontSize(9);

    factura.detalles.forEach((item, index) => {
      doc
        .text(`${index + 1}. ${item.descripcion || item.producto.nombre}`)
        .text(`   ${item.cantidad} x $${item.precio_unitario.toFixed(2)} = $${(item.cantidad*item.precio_unitario).toFixed(2)}`)
        .moveDown(0.2);
    });

    // === Totales ===
    doc
      .moveDown(0.5)
      .font('Helvetica-Bold')
      .text(`Subtotal: $${factura.total_sin_iva.toFixed(2)}`)
      .text(`IVA (13%): $${factura.total_iva.toFixed(2)}`)
      .text(`TOTAL A PAGAR: $${factura.total_con_iva.toFixed(2)}`)
      .moveDown();

    // === CUFE + Firma ===
    const cufe = `CUFE-${factura._id.toString().substring(0, 8)}-${fecha.getTime()}`;
    doc
      .font('Courier')
      .fontSize(8)
      .text(`CUFE: ${cufe}`)
      .text('FIRMA: JXKA-1923-AJS82', { align: 'left' })
      .moveDown();

    // === Código QR ===
    const qrData = `Factura: FEX-${factura.numero || factura._id}\nFecha: ${fecha.toLocaleDateString()}\nTotal: $${factura.total_con_iva.toFixed(2)}\nCUFE: ${cufe}`;
    const qrImageBuffer = await QRCode.toBuffer(qrData, { type: 'png' });
    const qrWidth = 100;
    const qrHeight = 100;
    const centerQrX = (doc.page.width - qrWidth) / 2;

    doc.image(qrImageBuffer, centerQrX, doc.y, { width: qrWidth });

    // Sube el puntero Y para que nada lo tape
    doc.y += qrHeight + 10;

    // === Frase legal ===
    doc
      .fontSize(8)
      .text('Documento no válido como crédito fiscal si monto menor a $100.00', {
        align: 'center',
      })
      .text('Gracias por su compra', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generando ticket:', error);
    res.status(500).json({ mensaje: 'Error generando ticket' });
  }
});


export default router;
