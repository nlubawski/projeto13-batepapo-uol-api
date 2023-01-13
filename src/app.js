import express, { json } from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'
import dayjs from 'dayjs'
import joi from "joi";

dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

try {
  await mongoClient.connect()
  db = mongoClient.db()
  console.log("deu bom")
} catch (error) {
  console.error(error)
}

const app = express();
const port = 5000;

app.use(cors())
app.use(express.json())

const participantSchema = joi.object({
  name: joi.string().required()
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid("message", "private_message").required(),
  from: joi.required(),
  time: joi.required()
});

app.post("/participants", async (req, res) => {
  const { body } = req;

  try {
    await participantSchema.validateAsync(body, { abortEarly: false });
  } catch (error) {
    return res.sendStatus(422);
  }

  const user = {
    name: body.name,
    lastStatus: Date.now()
  };

  const message = {
    from: body.name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss")
  }

  try {
    const existsUser = await db.collection("participants").find({ name: body.name }).toArray();
    console.log("user", existsUser)
    if (existsUser.length > 0) {
      return res.sendStatus(409)

    }
    await db.collection("participants").insertOne(user);
    await db.collection("messages").insertOne(message);
    return res.sendStatus(201);
  } catch (error) {
    return res.status(422).send(error);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find({}).toArray();
    return res.send(participants);
  } catch (error) {
    res.sendStatus(422);
  }
});

app.post("/messages", async (req, res) => {
  const { body } = req;
  const userFrom = req.headers.user
  const message = {
    from: userFrom,
    to: body.to,
    text: body.text,
    type: body.type,
    time: dayjs().format("HH:mm:ss")
  }

  try {
    await messageSchema.validateAsync(message, { abortEarly: false })
  } catch (error) {
    return res.sendStatus(422)
  }

  try {
    const participants = await db.collection("participants").findOne({ name: userFrom })
    if (!participants) return res.sendStatus(422)
    await db.collection("messages").insertOne(message)
    return res.sendStatus(201)
  } catch (error) {
    return res.sendStatus(422)
  }
})

app.get("/messages", async (req, res) => {
  let { limit } = req.query
  if (limit) {
    if (limit <= 0 || isNaN(limit)) {
      return res.sendStatus(422)
    }
  }
  const user = req.headers.user
  try {
    const messages = await db.collection("messages").find({
      $or: [{ from: user }, { to: user }, { to: 'Todos' }]
    }).toArray()

    if (!limit) return res.send(messages.reverse())
    res.send(messages.slice(-limit).reverse())

  } catch (error) {
    return res.sendStatus(422)
  }

})

app.post("/status", async (req, res) => {
  const user = req.headers.user
  try {
    const existsUser = await db.collection("participants").find({ name: user }).toArray()
    if (!existsUser) return res.sendStatus(200)
    await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() } })
    return res.statusCode(200)

  } catch (error) {
    return res.statusCode(404)
  }
})

checkStatus()
function checkStatus() {
  setInterval(async () => {
    try {
      const participants = await db.collection("participants").find().toArray()

      participants.forEach(async (participant) => {
        if (participant.lastStatus >= 10000) {
          await db.collection("participants").deleteOne({ _id: ObjectId(participant._id) })

          await db.collection("messages").insertOne({
            from: participant.name,
            to: 'Todos',
            text: 'sai da sala...',
            type: 'status',
            time: dayjs(Date.now()).format('HH:mm:ss')
          })
        }
      })
    } catch (error) {
      res.sendStatus(500)
    }
  }, 15000)
}


app.listen(port, () => {
  console.log("Server on in port ", port)
})

