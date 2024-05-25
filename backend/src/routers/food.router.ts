import { response, Router } from 'express';
import { QueryResult } from "pg";
import asyncHandler from 'express-async-handler';
import pool from "../configs/database.config";
import { sample_foods } from '../data';


const router = Router();

router.get(
    '/seed',
    asyncHandler(async (req, res) => {
        try {
            const foodsCountResult = await pool.query('SELECT COUNT(*) FROM food');
            const foodsCount = parseInt(foodsCountResult.rows[0].count, 10);

            if (foodsCount > 0) {
                res.send('Seed is already done!');
                return;
            }

            for (const food of sample_foods) {
                const { id, name, price, cooktime, favorite, origins, stars, imageurl, tags } = food;
                try {
                    await pool.query(
                        'INSERT INTO food (id, name, price, cooktime, favorite, origins, stars, imageurl, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                        [id, name, price, cooktime, favorite, origins, stars, imageurl, tags]
                    );
                    console.log(`Inserted food with ID ${id}`);
                } catch (error) {
                    console.error(`Error inserting food with ID ${id}:`, error);
                }
            }

            res.send('Seed Is Done!');
        } catch (error) {
            console.error('Error during seeding:', error);
            res.status(500).send('Error during seeding');
        }
    })
);


router.get(
    '/',// Este endpoint obtiene todos los alimentos
    asyncHandler(async (req, res) => {
        try {
            const food: QueryResult = await pool.query('SELECT * FROM food');
            console.log(food.rows);
            res.status(200).send(food.rows);
        } catch (error) {
            console.error('Error al obtener los alimentos:', error);
            res.status(500).send('Error al obtener los alimentos');
        }
    })
);

router.get(
    '/search/:searchTerm',// Este endpoint busca alimentos por su nombre
    asyncHandler(async (req, res) => { //se cambió el endpoint para que funcione con postgres
        const { name } = req.body;
        try {
            const food = await pool.query('SELECT * FROM food WHERE name = $1', [name])
            if (food.rows.length === 0) {
                res.status(404).json('Alimento no encontrado');
                return;
            }
            console.log(food.rows[0]);
            res.status(200).json(food.rows[0]);
        } catch (error) {
            console.error('Error al buscar el alimento:', error);
            res.status(500).json('Error al buscar el alimento');
        }
    })
);

router.get('/tags', async (req, res) => {
    try {
        const queryTags = `
           SELECT tag AS name, COUNT(*) AS count
    FROM (
        SELECT TRIM(unnest(tags)) AS tag
        FROM food
    ) AS tag_list
    GROUP BY tag
    ORDER BY count DESC
        `;
        const resultTags = await pool.query(queryTags);
        const tags = resultTags.rows;

        // Obtener el conteo total de alimentos para el tag "All"
        const queryTotalCount = 'SELECT COUNT(*) AS count FROM food';
        const resultTotalCount = await pool.query(queryTotalCount);
        const totalCount = resultTotalCount.rows[0].count;

        // Añadir el total al principio del array de tags
        tags.unshift({ name: 'All', count: totalCount });

        // Enviar el resultado

        res.json(tags);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error interno del servidor: ' + err);
    }
});

router.get(
    '/tag/:tagName', // Este endpoint busca alimentos por su etiqueta
    asyncHandler(async (req, res) => { //se cambió el endpoint para que funcione con postgres
        const { tags } = req.body;
        try {
            const food: QueryResult = await pool.query('SELECT * FROM food WHERE tags = $1', [tags])
            if (food.rows.length === 0) {
                console.log(food.rows);
                res.status(404).json('Alimento no encontrado');
                return;
            }
            console.log(food.rows);
            res.status(200).json(food.rows);
        } catch (error) {
            console.error('Error al buscar el alimento:', error);
            res.status(500).json('Error al buscar el alimento');
        }
    })
);

router.get(
    '/:foodId',// Este endpoint busca un alimento por su id
    asyncHandler(async (req, res) => {
        const { foodId } = req.params; // Acceder al parámetro foodId desde req.params
        try {
            const food: QueryResult = await pool.query('SELECT * FROM food WHERE id = $1', [foodId]); // Usar foodId en lugar de id
            if (food.rows.length === 0) {
                // print de id
                console.log(foodId); // Imprimir foodId en lugar de id
                res.status(404).json('Alimento no encontrado');
                return;
            }
            console.log(food.rows[0]);
            res.status(200).json(food.rows[0]);

        } catch (error) {
            console.error('Error al buscar el alimento:', error);
            res.status(500).json('Error al buscar el alimento');
        }
    })
);


export default router;
