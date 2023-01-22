const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const app = express()
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x6leq1p.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // await client.connect();
        const carDatabaseCollection = client.db('mastodon_services').collection('car_database');
        const mechanicsOrderBookingCollection = client.db('mastodon_services').collection('mechanics_order');
        const detailingOrderBookingCollection = client.db('mastodon_services').collection('detailing_order');
        const sparePartsOrderBookingCollection = client.db('mastodon_services').collection('spareParts_order');
        const userCollection = client.db('mastodon_services').collection('users');
        const productCollection = client.db('mastodon_services').collection('products');

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        //Payment Intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const order = req.body;
            console.log(order);
            const price = parseInt(order.CPrice);
            console.log(price)
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
            console.log(paymentIntent);
        });

        //if user exists update or if not exists added user during creating account
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        //set a user as admin role
        app.put('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden' })
            }

        })
        //user admin role
        app.delete('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(filter);
            res.send(result);
        })
        //Check admin role
        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })

        //Getting all users
        app.get('/users', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })
        //Getting all product
        app.get('/product/:key', async (req, res) => {
            const products = await productCollection.find(
                {
                    "$or": [
                        { name: { $regex: req.params.key } }
                    ]
                }
            ).toArray();
            res.send(products);
        })

        app.get('/cardata', async (req, res) => {
            const query = {};
            const cursor = carDatabaseCollection.find(query);
            const carData = await cursor.toArray();
            res.send(carData);
        })

        app.post('/mechanicsOrderbooking', async (req, res) => {
            const mechanicsOrderbooking = req.body;
            const result = await mechanicsOrderBookingCollection.insertOne(mechanicsOrderbooking);
            res.send(result);
        })
        // getting order with emailID
        app.get('/mechanicsOrderbooking', async (req, res) => {
            const email = req.query.CustomerEmail;
            const query = { CustomerEmail: email };
            const orders = await mechanicsOrderBookingCollection.find(query).toArray();
            res.send(orders)
        })

        // payment of mechanics by ID
        app.get('/mechanicsOrderbooking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const orders = await mechanicsOrderBookingCollection.findOne(query);
            res.send(orders)
        })


        app.post('/detailingOrderbooking', async (req, res) => {
            const detailingOrderbooking = req.body;
            const result = await detailingOrderBookingCollection.insertOne(detailingOrderbooking);
            res.send(result);
        })
        // getting order with emailID
        app.get('/detailingOrderbooking', verifyJWT, async (req, res) => {
            const email = req.query.CustomerEmail;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { CustomerEmail: email };
                const orders = await detailingOrderBookingCollection.find(query).toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' });
            }
        })

        // payment of mechanics by ID
        app.get('/detailingOrderbooking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const orders = await detailingOrderBookingCollection.findOne(query);
            res.send(orders)
        })



        app.post('/sparePartsOrderbooking', async (req, res) => {
            const sparePartsOrderbooking = req.body;
            const result = await sparePartsOrderBookingCollection.insertOne(sparePartsOrderbooking);
            res.send(result);
        })
        // getting order with emailID
        app.get('/sparePartsOrderbooking', async (req, res) => {
            const email = req.query.CustomerEmail
            const query = { CustomerEmail: email };
            const orders = await sparePartsOrderBookingCollection.find(query).toArray();
            res.send(orders)
        })
    }
    finally {

    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello from Mastodon!')
})

app.listen(port, () => {
    console.log(`Mastodon listening on port ${port}`)
})