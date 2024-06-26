const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');

const client = new Client({
    node: 'http://localhost:9200',
    log: 'trace',
    // auth: {
    //   username: 'elastic',
    //   password: 'sJYZI2qcB6iV*Alz4sMP'
    // },
    // tls: {
    //   ca: fs.readFileSync('/Users/shyam/elasticsearch-8.13.2/config/certs/http_ca.crt'),
    //   rejectUnauthorized: false
    // }
  })

const elasticServiceConnection = async () => {
    try {
        const res = await client.info();
        console.log('Elasticsearch is running');
        return new Promise((resolve, reject) => {
            resolve({ message: 'Elasticsearch is running', client: client, status: 200 });
        });
    } catch (e) {
        console.log(e);
        return new Promise((resolve, reject) => {
            resolve({ message: 'Elasticsearch is not running', client: client, status: 500 });
        });
    }
}

module.exports = { 
  client: client,
  elasticServiceConnection: elasticServiceConnection
};
