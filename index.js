const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@alpha10.qadkib3.mongodb.net/?retryWrites=true&w=majority&appName=Alpha10`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("eventDB");
    const usersCollection = db.collection("users");

    //signUp and store user in db api
    app.post("/register", async (req, res) => {
      const { email, password, name, photoURL } = req.body;

      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).send("Email already registered.");
      }

      const result = await usersCollection.insertOne({
        email,
        password,
        name,
        photoURL,
      });

      res.send(result);
    });

    //login user useing email and pass api
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;

      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(400).send({ message: "Invalid credentials." });
      }
      if (password !== user.password) {
        return res.status(400).send({ message: "Invalid credentials." });
      }
      res.send({
        message: "Login successful.",
        user: {
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
        },
      });
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Event management server");
});
app.listen(port, () => {
  console.log("server is running at", port);
});
