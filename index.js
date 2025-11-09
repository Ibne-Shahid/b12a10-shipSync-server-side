const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eqwoetz.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        await client.connect();

        const db = client.db('ship_sync_db')
        const productsCollection = db.collection('products')
        const importsCollection = db.collection('imports')

        // Products APIs

        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/latestProducts', async (req, res) => {
            const cursor = productsCollection.find().sort({ created_at: -1 }).limit(6)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id
            const {decreaseBy} = req.body
            const query = {_id: id}
            const updatedProduct = {
                $inc: { available_quantity: -parseInt(decreaseBy) }
            }
            const result = await productsCollection.updateOne(query, updatedProduct)
            res.send(result)
        })

        // Imported Products APIs

        app.get('/imports', async (req, res) => {
            const cursor = importsCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.post('/imports', async (req, res) => {
            const importProduct = req.body
            const { product, importer_email, importing_quantity, importer_name } = importProduct
            const query = { product, importer_email }
            const update = {
                $setOnInsert: { importer_name },
                $inc: { importing_quantity: parseInt(importing_quantity) }
            }
            const options = { upsert: true }
            const result = await importsCollection.updateOne(query, update, options)
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('ShipSync server is running.')
})

app.listen(port, () => {
    console.log(`ShipSync server is running on port: ${port}`)
})
