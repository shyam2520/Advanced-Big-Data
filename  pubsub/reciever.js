const amqp = require('amqplib/callback_api');
const {postDocument} = require('../services/elasticsearch.service');
const QUEUE = 'PUBSUB';
const reciever = () => {
    console.log('reciever running');
    amqp.connect('amqp://localhost', function (error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function (error1, channel) {
            if (error1) {
                throw error1;
            }
            channel.assertQueue(QUEUE, {
                durable: false
            });
            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", QUEUE);
            channel.consume(QUEUE, function (msg) {
                console.log(" [x] Received  message from queue ");
                const {operation,body} = JSON.parse(msg.content.toString());
                const planObject = body;
                console.log(operation,planObject)
                if(operation === 'POST'){
                    postDocument(planObject);
                }
            }, {
                noAck: true
            });
        });
    })
}

module.exports = reciever;
