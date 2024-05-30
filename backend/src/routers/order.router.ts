import {query, Router} from 'express';
import asyncHandler from 'express-async-handler';
import { HTTP_BAD_REQUEST } from '../constants/http_status';
import { OrderStatus } from '../constants/order_status';
import { OrderModel } from '../models/order.model';
import auth from '../middlewares/auth.mid';

import pool from "../configs/database.config";
export interface Food {
    id:number;
    name:string;
    price:number;
    tags: string[];
    favorite:boolean;
    stars: number;
    imageurl: string; //se renombra imageUrl por imageurl ya que las mayusculas dan error en postgres
    origins: string[];
    cooktime:string; //se renombra cookTime por cooktime ya que las mayusculas dan error en postgres
}

export interface OrderItem {
    id: number;
    price: number;
    quantity: number;
    food: Food;
}

export interface Order {
    id: string;
    totalPrice: number;
    name: string;
    address: string;
    paymentid: string;
    status: string;
    items: OrderItem[];
}

const router = Router();
// router.use(auth);

router.post('/create', asyncHandler(async (req, res) => {
    const order = req.body;
    console.log('order recieved', order);
    if (order.Items.length <= 0) {
        res.status(400).send('Cart Is Empty!');
        return;
    }

    try {
        console.log('order', order);

        // Delete any existing 'NEW' orders for the user
        await pool.query(`DELETE FROM orderitem WHERE order_id IN (SELECT id FROM "order" WHERE user_id = $1 AND status = $2)`, [order.userId, 'NEW']);
        await pool.query(`DELETE FROM latlng WHERE order_id IN (SELECT id FROM "order" WHERE user_id = $1 AND status = $2)`, [order.userId, 'NEW']);
        await pool.query(`DELETE FROM "order" WHERE user_id = $1 AND status = $2`, [order.userId, 'NEW']);

        // Insert the new order and get the new order ID
        const orderResult = await pool.query(`
            INSERT INTO "order" (totalprice, name, address, status, user_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [order.TotalPrice, order.Name, order.Address, 'NEW', order.userId]
        );

        const orderId = orderResult.rows[0].id;

        // Insert lat/lng for the order
        await pool.query(`
            INSERT INTO latlng (lat, lng, order_id)
            VALUES ($1, $2, $3)`,
            [order.AddressLatLng.lat, order.AddressLatLng.lng, orderId]
        );

        // Insert order items
        for (const item of order.Items) {
            await pool.query(`
                INSERT INTO orderitem (price, quantity, food_id, order_id)
                VALUES ($1, $2, $3, $4)`,
                [item.Price, item.Quantity, item.FoodId, orderId]
            );
        }

        // Update the order with the payment ID if provided
        if (order.paymentid) {
            await pool.query(`
                UPDATE "order"
                SET paymentid = $1
                WHERE id = $2`,
                [order.paymentid, orderId]
            );
        }

        // Send the new order ID as the response
        res.json({ orderId });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(400).send('Error creating order');
    }
}));

router.get('/newOrderForCurrentUser/:user_id',
    asyncHandler(async (req, res) => {
        const user_id = req.params.user_id;
        console.log('user received', user_id);

        try {
            // Realizamos la consulta para obtener la orden y los items de la orden, incluyendo detalles del food
            const result = await pool.query(`
                SELECT o.id, o.totalprice, o.name, o.address, o.paymentid, o.status,
                       oi.id AS item_id, oi.price AS item_price, oi.quantity AS item_quantity,
                       f.id AS food_id, f.name AS food_name, f.price AS food_price,
                       f.tags AS food_tags, f.favorite AS food_favorite, f.stars AS food_stars,
                       f.imageurl AS food_imageurl, f.origins AS food_origins, f.cooktime AS food_cooktime
                FROM "order" o
                JOIN orderitem oi ON o.id = oi.order_id
                JOIN food f ON oi.food_id = f.id
                WHERE o.user_id = $1 AND o.status = $2`,
                [user_id, 'NEW']
            );

            if (result.rows.length > 0) {
                const order: Order = {
                    id: result.rows[0].id,
                    totalPrice: result.rows[0].totalprice,
                    name: result.rows[0].name,
                    address: result.rows[0].address,
                    paymentid: result.rows[0].paymentid,
                    status: result.rows[0].status,
                    items: result.rows.map(row => ({
                        id: row.item_id,
                        price: row.item_price,
                        quantity: row.item_quantity,
                        food: {
                            id: row.food_id,
                            name: row.food_name,
                            price: row.food_price,
                            tags: row.food_tags,
                            favorite: row.food_favorite,
                            stars: row.food_stars,
                            imageurl: row.food_imageurl,
                            origins: row.food_origins,
                            cooktime: row.food_cooktime
                        }
                    }))
                };

                res.json(order);
            } else {
                res.status(404).json({ message: 'No new orders found for this user.' });
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    })
);



router.post('/pay', asyncHandler( async (req:any, res) => {
    const {paymentId} = req.body;
    console.log('paymentId from the frontend', paymentId);
    console.log('req.order', req.body.orderId);
    const order = await getNewOrderForCurrentUser(req);
    console.log('order found', order);
    if(!order){
        console.log('Order Not Found!');
        res.status(HTTP_BAD_REQUEST).send('Order Not Found!');
        return;
    }

    try {
        // Actualizar la orden con el ID de pago y cambiar el estado a PAYED
        const updatedOrder = await pool.query(`
            UPDATE "order"
            SET paymentid = $1, status = $2
            WHERE id = $3
            RETURNING id`,
            [paymentId, OrderStatus.PAYED, req.body.orderId]
        );

        res.json(updatedOrder.rows[0].id);
    } catch (error) {
        console.error('Error al actualizar la orden:', error);
        res.status(HTTP_BAD_REQUEST).send('Error al actualizar la orden');
    }
}))

router.get('/track/:id', asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT o.id, o.totalprice, o.name, o.address, o.paymentid, o.status,
                   oi.id AS item_id, oi.price AS item_price, oi.quantity AS item_quantity,
                   f.id AS food_id, f.name AS food_name, f.price AS food_price,
                   f.tags AS food_tags, f.favorite AS food_favorite, f.stars AS food_stars,
                   f.imageurl AS food_imageurl, f.origins AS food_origins, f.cooktime AS food_cooktime
            FROM "order" o
            JOIN orderitem oi ON o.id = oi.order_id
            JOIN food f ON oi.food_id = f.id
            WHERE o.id = $1;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length > 0) {
            const order: Order = {
                id: result.rows[0].id,
                totalPrice: result.rows[0].totalprice,
                name: result.rows[0].name,
                address: result.rows[0].address,
                paymentid: result.rows[0].paymentid,
                status: result.rows[0].status,
                items: result.rows.map(row => ({
                    id: row.item_id,
                    price: row.item_price,
                    quantity: row.item_quantity,
                    food: {
                        id: row.food_id,
                        name: row.food_name,
                        price: row.food_price,
                        tags: row.food_tags,
                        favorite: row.food_favorite,
                        stars: row.food_stars,
                        imageurl: row.food_imageurl,
                        origins: row.food_origins,
                        cooktime: row.food_cooktime
                    }
                }))
            };

            res.json(order);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));

export default router;

async function getNewOrderForCurrentUser(req: any) {// Esta función obtiene la nueva orden para el usuario actual
    const orderId = req.body.orderId;
    const result = await pool.query(`
    SELECT * FROM "order"
    WHERE id = $1 AND status = $2`,
    [orderId, OrderStatus.NEW]
    );


    console.log('result', result.rows);
    return result.rows[0];
}
