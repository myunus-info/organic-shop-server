const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

require("dotenv").config();
const port = process.env.PORT || 5000;
const { DB_USER, DB_PASS, DB_NAME } = process.env;

const admin = require("firebase-admin");
const serviceAccount = require("./configs/organic-shop-bd-firebase-adminsdk-pfvp8-dbe5d0d288.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.get("/", (req, res) => {
  res.send("Hi from express!");
});

const uri = `mongodb+srv://${DB_USER}:${DB_PASS}@cluster0.ckmix.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  const collection = client.db(DB_NAME).collection("products");
  const orders = client.db(DB_NAME).collection("orders");

  // Add to the database
  app.post("/addProduct", (req, res) => {
    const product = req.body;
    collection.insertOne(product).then((result) => {
      res.send(result.acknowledged);
    });
  });

  // Read from the database
  app.get("/products", (req, res) => {
    collection.find({}).toArray((err, docs) => {
      res.send(docs);
    });
  });

  // Read by ID
  app.get("/checkout/:id", (req, res) => {
    collection.find({ _id: ObjectId(req.params.id) }).toArray((err, docs) => {
      res.send(docs[0]);
    });
  });

  // Add an order
  app.post("/addOrder", (req, res) => {
    const productOrder = req.body;
    orders.insertOne(productOrder).then((result) => {
      res.send(result.acknowledged);
    });
  });

  // Read data with authentications
  app.get("/orders", (req, res) => {
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith("Bearer ")) {
      const idToken = bearer.split(" ")[1];

      admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
          const decodedEmail = decodedToken.email;
          const queryEmail = req.query.email;
          if (decodedEmail === queryEmail) {
            orders.find({ email: queryEmail }).toArray((err, docs) => {
              res.status(200).send(docs);
            });
          } else {
            res.status(401).send("Unauthorized access. Please Authenticate!");
          }
        })
        .catch((err) => {
          console.log(err.message);
        });
    }
  });

  // remove order
  app.delete("/removeOrder/:id", (req, res) => {
    orders.deleteOne({ _id: req.params.id }).then((result) => {
      res.send(result.deletedCount > 0);
      console.log(result.deletedCount);
    });
  });

  // Remove product
  app.delete("/removeProduct/:id", (req, res) => {
    collection.deleteOne({ _id: ObjectId(req.params.id) }).then((result) => {
      res.send(result.deletedCount > 0);
    });
  });
});

app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
