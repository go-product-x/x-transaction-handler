const { Client } = require('pg')

let pg_url = process.env.DATABASE_URL

const mapToUser = async (id) => {
    const client = new Client({ connectionString: pg_url, ssl: true })
    try {
        await client.connect()
        client.query('LISTEN new_transaction')
        client.on('notification', async (message) => {
            let payload = JSON.parse(message.payload)
            let result = await client.query('SELECT id FROM users WHERE ssn = $1', [payload.SSN])
            let user_id = result.rows[0].id
            let update = await client.query('UPDATE transactions SET user_id = $1 WHERE id = $2 RETURNING *', [user_id, payload.id])
            console.log("New transaction mapped to user", update.rows[0].id);
        })
    }
    catch (error) {
        console.log("Something went wrong mapping to the user", error)
    }
}


module.exports = mapToUser
