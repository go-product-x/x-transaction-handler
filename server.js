//Require modules
require('dotenv').config() //Uncomment for use in local environment

//Import handler functions
let consumeInitialTransactionFromQueue = require('./logic/initial-transaction-to-database.js')
let mapToUser = require('./logic/map-to-user.js')
let mapToStore = require('./logic/map-to-store.js')

//Run functions
consumeInitialTransactionFromQueue()
mapToUser()
mapToStore()










