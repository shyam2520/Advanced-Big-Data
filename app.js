var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var reciever = require('./ pubsub/reciever');
var {client, elasticServiceConnection} = require('./services/elasticServiceConnection');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.listen(3000,async  function() {
  try{
    await elasticServiceConnection();
    console.log('Server is running on port 3000');
  }
  catch(err){
    console.error(err);
  }

});
module.exports = app;
