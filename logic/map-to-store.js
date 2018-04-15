const { Client } = require('pg')
const amqp = require('amqplib')

let pg_url = process.env.DATABASE_URL
let mq_url = process.env.CLOUDAMQP_URL

const mapToStore = async (id) => {
    try {
        const client = new Client({ connectionString: pg_url, ssl: true })
        await client.connect()
        client.query('LISTEN new_transaction')
        client.on('notification', async (message) => {
            let payload = JSON.parse(message.payload)
            let result = await client.query('SELECT id, store_name FROM stores WHERE payment_terminal_id = $1', [payload.payment_terminal_id])

            if (result.rows.length) {
                let store_id = result.rows[0].id
                let store_name = result.rows[0].store_name
                let update = await client.query('UPDATE transactions SET store_id = $1, store_name = $2 WHERE id = $3 RETURNING *', [store_id, store_name, payload.id])
                console.log("New transaction mapped to store", update.rows[0].id)
            } else {
                try {
                    const conn = await amqp.connect(mq_url)
                    const channel = await conn.createChannel()
                    const q = 'pending-unmapped-transaction'
                    let msg = JSON.stringify(payload.id)
                    await channel.assertQueue(q, { durable: true })
                    await channel.sendToQueue(q, Buffer.from(msg), { persistent: true })
                    console.log(" New unmapped transaction added to queue", msg)
                    return channel.close()

                } catch (error) {
                    console.log("Error writing to queue", error)
                }
                finally {
                    () => {
                        conn.close()
                    }
                }
            }
        })
    }
    catch (error) {
        console.log("Something went wrong mapping to a store", error)
    }
}

module.exports = mapToStore