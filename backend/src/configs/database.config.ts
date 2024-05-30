import { Pool } from 'pg';

const pool = new Pool({
    user: 'comida_owner',
    host: 'ep-shy-moon-a6meo5nb.us-west-2.aws.neon.tech',
    database: 'comida',
    password: 'ZP7hz6jLKnHt',
    port: parseInt('5432'),
    ssl: {
        rejectUnauthorized: false  // Importante en entornos de desarrollo con SSL autofirmado, ajustar para producción
    }
});

export default pool;



