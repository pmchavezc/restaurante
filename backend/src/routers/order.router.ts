import {query, Router} from 'express';
import asyncHandler from 'express-async-handler';
import { HTTP_BAD_REQUEST } from '../constants/http_status';
import { OrderStatus } from '../constants/order_status';
import { OrderModel } from '../models/order.model';
import auth from '../middlewares/auth.mid';

import pool from "../configs/database.config";

const router = Router();
router.use(auth);

router.post('/create',// Este endpoint crea una nueva orden
    asyncHandler(async (req, res) => {
        const order = req.body;

        if (order.items.length <= 0) {
            res.status(HTTP_BAD_REQUEST).send('Cart Is Empty!');
            return;
        }

        try {
            // Eliminar la orden existente del usuario si existe y tiene estado NEW
            console.log('order', order);
            await pool.query(` DELETE FROM "order" WHERE user = ${order.user.id} AND status = ${OrderStatus.NEW}`);

            // Insertar la nueva orden en la base de datos
            const result = await pool.query(`
        INSERT INTO "order" (user, status, name, address, address_lat, address_lng, paymentid, totalprice, created_at, updated_at)
        VALUES (${OrderStatus.NEW}, ${order.name}, ${order.address}, ${order.addressLatLng.lat}, ${order.addressLatLng.lng}, ${order.paymentid}, ${order.totalprice}, NOW(), NOW())
        RETURNING *`);

            // Enviar la nueva orden como respuesta
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error al crear la orden:', error);
            res.status(HTTP_BAD_REQUEST).send('Error al crear la orden');
        }
    })
);


router.get('/newOrderForCurrentUser', // Este endpoint obtiene la nueva orden para el usuario actual
    asyncHandler(async (req, res) => {
        const order = req.body;

        if (!order.items || order.items.length <= 0) {
            res.status(HTTP_BAD_REQUEST).send('Cart Is Empty!');
            return;
        }

        try {
            // Eliminar la orden existente del usuario si existe y tiene estado NEW
            await pool.query(` DELETE FROM "order" WHERE user = ${order.user.id} AND status = ${OrderStatus.NEW}`);

            // Insertar la nueva orden en la base de datos
            const result = await pool.query(`
        INSERT INTO "order" (user, status, name, address, address_lat, address_lng, paymentid, totalprice, created_at, updated_at)
        VALUES (${order.user.id}, ${OrderStatus.NEW}, ${order.name}, ${order.address}, ${order.addressLatLng.lat}, ${order.addressLatLng.lng}, ${order.paymentid}, ${order.totalprice}, NOW(), NOW())
        RETURNING *`);

            // Insertar los items de la orden en la tabla orderitem
            for (const item of order.items) {
                await pool.query(`
        INSERT INTO "orderitem" (order_id, food_id, price, quantity)
        VALUES (${result.rows[0].id}, ${item.food_id}, ${item.price}, ${item.quantity})`);
            }

            // Enviar la nueva orden como respuesta
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error al crear la orden:', error);
            res.status(HTTP_BAD_REQUEST).send('Error al crear la orden');
        }
    }));


router.post('/pay', asyncHandler( async (req:any, res) => {
    const {paymentId} = req.body;
    const order = await getNewOrderForCurrentUser(req);
    if(!order){
        res.status(HTTP_BAD_REQUEST).send('Order Not Found!');
        return;
    }

    try {
        // Actualizar la orden con el ID de pago y cambiar el estado a PAYED
        const updatedOrder = await pool.query(`
      UPDATE "order"
      SET paymentid = ${paymentId}, status = ${OrderStatus.PAYED}
      WHERE id = ${order.id}
      RETURNING *`);

        res.json(updatedOrder.rows[0].id);
    } catch (error) {
        console.error('Error al actualizar la orden:', error);
        res.status(HTTP_BAD_REQUEST).send('Error al actualizar la orden');
    }
}))

router.get('/track/:id', asyncHandler( async (req, res) => {
    const order = await OrderModel.findById(req.params.id);
    res.send(order);
}))

export default router;

async function getNewOrderForCurrentUser(req: any) {// Esta función obtiene la nueva orden para el usuario actual
    return await OrderModel.findOne({ user: req.user.id, status: OrderStatus.NEW });
}
