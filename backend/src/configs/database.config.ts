import { Pool } from 'pg';

const pool = new Pool({
    user: 'prografood2024',
    host: 'progra-food-progra.postgres.database.azure.com',
    database: 'progra-food',
    password: '$Hello2024+',
    port: parseInt('5432'),
    ssl: {
        rejectUnauthorized: false  // Importante en entornos de desarrollo con SSL autofirmado, ajustar para producción
    }
});

export default pool;



