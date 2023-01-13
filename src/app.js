import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { MongoClient } from 'mongodb'
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

app.listen(port, () => {
  console.log("Server on in port ", port)
})