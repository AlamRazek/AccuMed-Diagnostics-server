const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xqlvbzz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("AccuMedDB").collection("users");
    const testCollection = client.db("AccuMedDB").collection("allTest");
    const bannerCollection = client.db("AccuMedDB").collection("allBanner");

    const reservationCollection = client
      .db("AccuMedDB")
      .collection("allReservation");

    const allUpcomingTestCollection = client
      .db("AccuMedDB")
      .collection("upcomingTestCollection");

    const allRecommendationSlider = client
      .db("AccuMedDB")
      .collection("recommendationSlider");
    const allRatingsCollection = client.db("AccuMedDB").collection("ratings");

    // const allRatingsCollection = client.db("AccuMedDB").collection("ratings");

    // jwt related api
    // creating jwt token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    //users related api
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    //get one user
    app.get("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      let user = false;
      if (result) {
        user = result.status === "active";
      }
      res.send({ user });
    });
    // get user profile
    app.get("/profile/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // update user
    app.patch("/users/update/:email", async (req, res) => {
      const item = req.body;
      const { email } = req.params;
      const filter = { email: email };
      const updateDoc = {
        $set: {
          name: item.name,
          bloodGroup: item.bloodGroup,
          districts: item.districts,
          upazilas: item.upazilas,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // to check email contains admin email
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // add test
    app.post("/test", async (req, res) => {
      const user = req.body;
      const result = await testCollection.insertOne(user);
      res.send(result);
    });
    // get all test
    app.get("/test", async (req, res) => {
      console.log("pagination", req.query);
      const result = await testCollection.find().toArray();
      res.send(result);
    });
    // search function by date
    app.get("/testDate/:date", async (req, res) => {
      const date = req.params.date;
      const result = await testCollection
        .find({ date: { $gte: date } })
        .toArray();

      res.send(result);
    });
    /*   // get a single test
    app.get("/test/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testCollection.findOne(query);
      res.send(result);
    }); */

    // see a test details
    app.get("/card/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testCollection.findOne(query);
      res.send(result);
    });

    // delete a test
    app.delete("/test/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testCollection.deleteOne(query);
      res.send(result);
    });

    // update a test
    app.patch("/test/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          details: item.details,
          slots: item.slots,
          image: item.image,
          date: item.date,
        },
      };
      const result = await testCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // make a user admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // block and unblock a user
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: "block",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // reservations
    // all reservations
    app.get("/reservations", async (req, res) => {
      const result = await reservationCollection.find().toArray();
      res.send(result);
    });
    app.get("/appointment", async (req, res) => {
      const result = await allUpcomingTestCollection.find().toArray();
      res.send(result);
    });
    // add a reservation to DB
    app.post("/reservations", async (req, res) => {
      const reservation = req.body;
      const result = await reservationCollection.insertOne(reservation);
      res.send(result);
    });

    // delete a reservation
    app.delete("/reservations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reservationCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/appointmentResult/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allUpcomingTestCollection.deleteOne(query);
      res.send(result);
    });

    // deliver a reservation by submit
    app.patch("/appointmentResult/:id", async (req, res) => {
      9;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          reportStatus: "delivered",
        },
      };
      const result = await allUpcomingTestCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    // update reservations slots -1 from testCollections
    app.patch("/updateSlots/:id", async (req, res) => {
      const postId = req.params.id;
      const filter = { _id: new ObjectId(postId) };

      const update = { $inc: { slots: -1 } };
      const result = await testCollection.updateOne(filter, update);
      res.send(result);
    });

    // user reservation according to email
    app.get("/reservation/:email", async (req, res) => {
      const { email } = req.params;
      const result = await reservationCollection.find({ email }).toArray();
      res.send(result);
    });

    // dynamic banner
    // get all banners
    app.get("/banners", async (req, res) => {
      const result = await bannerCollection.find().toArray();
      res.send(result);
    });

    // post a banner
    app.post("/banners", async (req, res) => {
      const banner = req.body;
      const result = await bannerCollection.insertOne(banner);
      res.send(result);
    });

    // change banner
    app.put("/banners/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      await bannerCollection.updateMany({}, { $set: { isActive: "false" } });
      await bannerCollection.updateOne(filter, {
        $set: { isActive: "true" },
      });

      res.status(200).send("Banner selection updated successfully");
    });

    // delete a banner
    app.delete("/banner/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = bannerCollection.deleteOne(query);
      res.send(result);
    });

    // get promoCode from banner DB
    app.post("/banner/promo-code/:coupon", async (req, res) => {
      const { coupon } = req.params;
      const promoCode = await bannerCollection.findOne({ coupon });
      if (promoCode) {
        res.json({ rate: promoCode.rate });
      }
    });

    // recommendation slider
    app.get("/slider", async (req, res) => {
      const result = await allRecommendationSlider.find().toArray();
      res.send(result);
    });

    // delete an Appointment
    app.delete("/appointment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allUpcomingTestCollection.deleteOne(query);
      res.send(result);
    });

    // stripe payment method
    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req?.body;
      const amount = parseInt(price * 100);
      console.log(amount, "inside the intent");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payments
    app.get("/payments/:email", verifyToken, async (req, res) => {
      if (!req.params.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: req.params.email };
      const result = await allUpcomingTestCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await allUpcomingTestCollection.insertOne(payment);
      console.log(result);
      const query = {
        _id: {
          $in: payment.reservationId.map((id) => new ObjectId(id)),
        },
      };
      const deleteReservations = await reservationCollection.deleteMany(query);
      res.send({ result, deleteReservations });
    });

    // get all the ratings
    app.get("/ratings", async (req, res) => {
      const result = await allRatingsCollection.find().toArray();
      console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    /*   await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    ); */
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("accumed server is running");
});

app.listen(port, () => {
  console.log(`accumed server is running on port ${port}`);
});
