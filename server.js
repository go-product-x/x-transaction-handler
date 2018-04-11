//Require modules
//require('dotenv').config() //Uncomment for use in local environment

//Import handler functions
let consumeInitialTransactionFromQueue = require('./logic/initial-transaction-to-database.js')

//Run functions
consumeInitialTransactionFromQueue()







