import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

import productoRoutes from './routes/producto.js';
import clienteRoutes from './routes/cliente.js';
import facturaRoutes from './routes/factura.js';
import dashboardRoutes from './routes/dashboard.js';
import proveedorRoutes from './routes/proveedor.js';

dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/productos', productoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/proveedores', proveedorRoutes);


// Conectar a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conection to Database sucessful'))
  .catch((err) => console.error('Error to conect to DataBase:', err));

// Servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});