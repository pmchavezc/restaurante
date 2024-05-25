import { Pool } from 'pg';

// Configuración de la conexión a la base de datos
const pool = new Pool({
    connectionString: 'postgres://usuario:IVBlxquHntKdoOBDY0rnCw2Wn2QWLdBz@dpg-cp38uu821fec73b3k7r0-a.oregon-postgres.render.com/proyecttodb1_y2ra',
    ssl: {
        rejectUnauthorized: false  // Importante en entornos de desarrollo con SSL autofirmado, ajustar para producción
    }
});

export default pool;

