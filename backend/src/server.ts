import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import express from 'express';
import cors from 'cors';
import foodRouter from './routers/food.router';
import userRouter from './routers/user.router';
import orderRouter from './routers/order.router';

const app = express();
app.use(express.json());
app.use(cors({
    credentials: true,
    origin: ["http://localhost:4200"]
}));

app.use("/api/foods", foodRouter);
app.use("/api/users", userRouter);
app.use("/api/orders", orderRouter);

// Correct path to the public directory
const publicDir = path.resolve(__dirname, 'public');
console.log('Serving static files from:', publicDir);

app.use(express.static(publicDir));
app.get('*', (req, res) => {
    const indexPath = path.resolve(publicDir, 'index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log("Website served on http://localhost:" + port);
});

