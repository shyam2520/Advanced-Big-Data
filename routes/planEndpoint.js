var express = require('express');
var planRouter = express.Router();
const [healthCheck, client] = require('../middlewares/healthCheck');
const etagCreater = require('../middlewares/etagCreater');


planRouter.post('/plan', healthCheck, async (req, res) => {
    if (req._body == false || req.get('Content-length') == 0 || !req.body['objectId']) {
        res.status(400).send('Bad Request');
    }
    client.set(req.body['objectId'], JSON.stringify(req.body),
        (err, reply) => {
            if (err) {
                res.status(500).send();
            }
            //   console.log("Reply : ", reply)
        })
    const response = await client.get(req.body['objectId']);
    res.set('Etag', etagCreater(JSON.stringify(response)));
    return res.status(201).send(req.body);
})

planRouter.get('/plan', healthCheck, async (req, res) => {
    try {
        const keys = await client.keys('*');
        let result = [];
        for (let key of keys) {
            const value = await client.get(key);
            result.push(JSON.parse(value));
        }
        const etagRes = etagCreater(JSON.stringify(result))
        if(req.get('If-None-Match') && etagRes== req.get('If-None-Match')){
            return res.status(304).send();
        }
        res.set('Etag', etagRes);
        return res.status(200).send(result);
    }
    catch (err) {
        console.log(err)
        return res.status(500).send();
    }
})

planRouter.get('/plan/:id', healthCheck, async (req, res) => {
    try {
        const reponse = await client.get(req.params.id);
        if (reponse == null) {
            return res.status(404).send('Not Found');
        }
        const etagRes = etagCreater(JSON.stringify(reponse))
        if(req.get('If-None-Match') && etagRes == req.get('If-None-Match')){
            return res.status(304).send();
        }
        res.set('Etag', etagRes);
        return res.status(200).send(JSON.parse(reponse));
    }
    catch (err) {
        console.log(err)
       return  res.status(500).send();
    }
})

planRouter.delete('/plan/:id', healthCheck, async (req, res) => {
    try {
        const response = await client.del(req.params.id);
        if (response == 0) {
            return res.status(404).send('Not Found');
        }
        return res.status(204).send();
    }
    catch (err) {
        console.log(err)
        return res.status(500).send();
    }
})

module.exports = planRouter;
