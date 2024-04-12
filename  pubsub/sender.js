const ampq = require('amqplib/callback_api');
const QUEUE = 'PUBSUB';
const sender = (messageData) => {
    ampq.connect('amqp://localhost', (error0, connection)  => {
        if (error0) {
            throw error0;
        }
        connection.createChannel( (error1, channel) => {
            if (error1) {
                throw error1;
            }
     
            var msg = JSON.stringify(messageData);
            channel.assertQueue( QUEUE, {
                durable: false
            });
            channel.sendToQueue(QUEUE, Buffer.from(msg));
            console.log("Sent a message to the queue ");
        });
    })
}

module.exports = sender;
