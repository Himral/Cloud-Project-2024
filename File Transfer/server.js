var express = require("express");
var app = express();
var httpObj = require("http");
var http = httpObj.createServer(app);

var mainURL = "http://localhost:3000";

var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

http.listen(3000, function() {
    console.log("Server started at " + mainURL);

    mongoClient.connect("mongodb://localhost:27017", function(error, client) {
        if (error) {
            console.error("Error connecting to MongoDB:", error);
        } else {
            database = client.db("file_transfer");
            console.log("Database connected");
        }
    });
});
