const express = require('express'),
  app = express(),
  knex = require('./db/knex'),
  bodyParser = require('body-parser'),
  path = require("path"),
  port = process.env.PORT || 3000,
  morgan = require('morgan');

app.use('/stylesheets',express.static(path.join(__dirname, '../client/stylesheets')));
app.use('/js',express.static(path.join(__dirname, '../client/javascripts')));
app.use('/templates',express.static(path.join(__dirname, '../client/templates')));

app.use(morgan("tiny"));
app.use(bodyParser.json());

app.get("/", (req,res) => {
  res.sendFile(path.join(__dirname, '../client/templates', 'base.html'));
});



app.listen(port,()=> console.log(`Listening on port ${port}`));
