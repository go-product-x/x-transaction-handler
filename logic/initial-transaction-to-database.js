//Require modules
const { Pool } = require('pg')
const amqp = require('amqplib')

//Declare connection ENV vars
let mq_url = process.env.CLOUDAMQP_URL
let pg_url = process.env.DATABASE_URL

//A handler function to consume a transaction message from the queue
//'initial-transaction-task' and write it to the transactions table in Postgres
const consumeTransactionFromQueue = async () => {
    try {
        //Connect to PG and RabbitMQ
        const pool = new Pool({ connectionString: pg_url, ssl: true })
        const conn = await amqp.connect(mq_url)

        //Create a RabbitMQ channel and assert the queue as durable
        const channel = await conn.createChannel()
        const q = await channel.assertQueue('initial-transaction-task', { durable: true })

        //Wait for new messages to become available
        await console.log(' [*] Waiting for messages. To exit press CTRL+C')

        //Prefetch 1 message at a time for processing
        await channel.prefetch(1)

        //Main consumption function
        await channel.consume(q.queue, async (msg) => {
            //Write the msg Buffer into a JSON object
            let message = JSON.parse(msg.content.toString())
            console.log("Writing transaction " + message.payment_terminal_id)

            //Declare a client used for connection to the pool, and define the query
            let client = null
            let query = `
                        INSERT INTO transactions(
                            ssn,
                            payment_terminal_id,
                            country_code,
                            currency,
                            amount,
                            user_id,
                            store_id
                            ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7
                            )
                        `
            //Attempt to connect to the pool, catching a connection error if fails                
            try {
                client = await pool.connect()
            } catch (error) {
                console.log("A connection error occured", error)
            }
            //Begin the query, catching an error will attempt a rollback
            try {
                await client.query('BEGIN')
                await client.query(query, [
                    message.SSN,
                    message.payment_terminal_id,
                    message.country_code,
                    message.currency,
                    message.amount,
                    message.user_id,
                    message.store.store_id
                ])
                await client.query('COMMIT')
                await console.log("Query succesfully commited!")
            }
            //Begin roll back if error caught
            catch (error) {
                try {
                    await client.query('ROLLBACK')
                }
                catch (rollbackError) {
                    console.log('Attempted to rollback, but error occured', rollbackError)
                }
                console.log('There was an error commiting the query', error)
            }
            //Release the client back into the pool
            finally {
                client.release()
                channel.ack(msg)
            }
        },
            //Acknowledge that the message has now been consumed   
            { noAck: false })
    }
    //Handle a top level RabbitMQ consumption error
    catch (error) {
        console.warn(error)
    }
}

module.exports = consumeTransactionFromQueue
