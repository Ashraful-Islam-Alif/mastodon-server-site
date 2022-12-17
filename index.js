const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x6leq1p.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const carDatabaseCollection = client.db('mastodon_services').collection('car_database');
        const mechanicsOrderBookingCollection = client.db('mastodon_services').collection('mechanics_order');

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