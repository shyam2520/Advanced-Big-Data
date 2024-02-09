const crypto = require('crypto');

const etagCreater = (responseBody) =>{
    return crypto.createHash('md5').update(responseBody).digest('hex');
}

module.exports = etagCreater;
