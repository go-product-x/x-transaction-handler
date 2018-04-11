require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
let app = express()

var consumeTransactionFromQueue = require('./logic/initial-transaction-to-database.js')


consumeTransactionFromQueue()







