const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x6leq1p.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const carDatabaseCollection = client.db('mastodon_services').collection('car_database');
        const mechanicsOrderBookingCollection = client.db('mastodon_services').collection('mechanics_order');
        const detailingOrderBookingCollection = client.db('mastodon_services').collection('detailing_order');
        const sparePartsOrderBookingCollection = client.db('mastodon_services').collection('spareParts_order');

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
        app.get('/mechanicsOrderbooking', async (req, res) => {
            const email = req.query.CustomerEmail
            const query = { CustomerEmail: email };
            const orders = await mechanicsOrderBookingCollection.find(query).toArray();
            res.send(orders)
        })


        app.post('/detailingOrderbooking', async (req, res) => {
            const detailingOrderbooking = req.body;
            const result = await detailingOrderBookingCollection.insertOne(detailingOrderbooking);
            res.send(result);
        })
        app.get('/detailingOrderbooking', async (req, res) => {
            const email = req.query.CustomerEmail
            const query = { CustomerEmail: email };
            const orders = await detailingOrderBookingCollection.find(query).toArray();
            res.send(orders)
        })


        app.post('/sparePartsOrderbooking', async (req, res) => {
            const sparePartsOrderbooking = req.body;
            const result = await sparePartsOrderBookingCollection.insertOne(sparePartsOrderbooking);
            res.send(result);
        })
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