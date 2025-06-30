require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
    const eventsCollection = db.collection("events");

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
        return res.status(400).send("Invalid credentials");
      }
      if (password !== user.password) {
        return res.status(400).send("Invalid password");
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

    //add event api
    app.post("/events", async (req, res) => {
      const newEvent = req.body;
      const result = await eventsCollection.insertOne(newEvent);

      res.send(result);
    });

    //get all event api
    app.get("/events", async (req, res) => {
      const result = await eventsCollection
        .find()
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    //get event by search and filter
    app.get("/events/search", async (req, res) => {
      const { title, filter } = req.query;

      const query = {};
      let start, end;

      const now = new Date();

      // Title search
      if (title) {
        query.eventTitle = { $regex: title, $options: "i" };
      }

      // filter by date
      if (filter === "today") {
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
      } else if (filter === "currentWeek") {
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        start = new Date(now);
        start.setDate(now.getDate() + diffToMonday);
        start.setHours(0, 0, 0, 0);

        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (filter === "lastWeek") {
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        end = new Date(now);
        end.setDate(now.getDate() + diffToMonday - 1);
        end.setHours(23, 59, 59, 999);

        start = new Date(end);
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);
      } else if (filter === "currentMonth") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
      } else if (filter === "lastMonth") {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      }

      if (start && end) {
        query.dateAndTime = {
          $gte: start.toISOString(),
          $lte: end.toISOString(),
        };
      }

      let result;
      //if no search exist
      if (!title && !filter) {
        result = await eventsCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
      } else {
        //if query exist
        result = await eventsCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();
      }

      res.send(result);
    });
    //get event by id
    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const result = await eventsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //increase attendee and email based attendee look
    app.patch("/events/:id/join", async (req, res) => {
      const eventId = req.params.id;
      const { userEmail } = req.body;

      const result = await eventsCollection.updateOne(
        {
          _id: new ObjectId(eventId),
          attendee: { $ne: userEmail },
        },
        {
          $inc: { attendeeCount: 1 },
          $addToSet: { attendee: userEmail },
        }
      );
      res.send(result);
    });

    //get event by specific email
    app.get("/events/user/:email", async (req, res) => {
      const email = req.params.email;
      const events = await eventsCollection
        .find({ userEmail: email })
        .toArray();
      res.send(events);
    });

    //update event details api
    app.patch("/events/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      const result = await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    //delete event api
    app.delete("/events/:id", async (req, res) => {
      const id = req.params.id;

      const result = await eventsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
