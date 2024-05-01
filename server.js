var express = require("express");
var app = express();
var httpObj = require("http");
var http = httpObj.createServer(app);

var mainURL = "http://localhost:3002";

var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

app.set("view engine", "ejs");

app.use("/public/css", express.static(__dirname + "/public/css"));
app.use("/public/js", express.static(__dirname + "/public/js"));
app.use("/public/font-awesome-4.7.0", express.static(__dirname + "/public/font-awesome-4.7.0"));

var session = require("express-session");
app.use(session({
    secret: "secret key",
    resave: false,
    saveUninitialized: false
}));

app.use(function(request, result, next){
    request.mainURL = mainURL;
    request.isLogin = (typeof request.session.user !== "undefined");
    request.user = request.session.user;

    next();
});
http.listen(3002, function(){
    console.log("Server started at " + mainURL);

    mongoClient.connect("mongodb://localhost:27017", {
        useUnifiedTopology: true
    },function(error, client){
        if(error){
            console.log("Error creating db");
        }

        database = client.db("file_transfer");
        console.log("Database connected.");

        app.get("/", function(request, result){
            result.render("index", {
                "request": request
            });
        });
    });
});



