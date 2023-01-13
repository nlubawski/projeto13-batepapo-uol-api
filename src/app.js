import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { MongoClient } from 'mongodb'

dotenv.config()

const app = express();
const port = 5000;


app.listen(port,()=>{
  console.log("Server on in port ", port)
})