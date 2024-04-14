var express = require("express");
var app = express();
var httpObj = require("http");
var http = httpObj.createServer(app);

var mainURL = "http://localhost:3000";

var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

app.set("view engine" , "ejs") ;

app.use("/public/css" , express.static(__dirname + "/public/css")) ;
app.use("/public/js" , express.static(__dirname + "/public/js")) ;
app.use("/public/font-awesome-4.7.0" , express.static(__dirname + "/public/font-awesome-4.7.0")) ;

var session = require("express-session") ;
app.use(session({
    secret: "secret key" ,
    resave: false ,
    saveUninitialized: false
}));

app.use(function(request , result , next){
    request.mainURL = mainURL ;
    request.isLogin = (typeof request.session.user !== "undefined") ;
    request.user = request.session.user ;

    next() ;
});

var formidable = require("express-formidable");
app.use(formidable());

var bcrypt = require("bcrypt");
var nodemailer = require("nodemailer");

var nodemailerFrom = "ishitamoorjani@gmail.com" ;
var nodemailerObject = {
    service: "gmail" ,
    host: "smtp.gmail.com" ,
    port: 465 ,
    secure: true ,
    auth: {
        user: "ishitamoorjani@gmail.com" ,
        pass: "password"
    }
};

http.listen(3000, function() {
    console.log("Server started at " + mainURL);

    mongoClient.connect("mongodb://localhost:27017", function(error, client) {
        if (error) {
            console.error("Error connecting to MongoDB:", error);
        } else {
            database = client.db("file_transfer");
            console.log("Database connected");
        
        app.get("/" , function(request , result) {
            result.render("index" , {
                "request": request
            });
        });
        
        app.get("/Register" , function(request , result) {
            result.render("Register" , {
                "request": request
            });
        });

        app.post("/Register" , async function(request , result) {
            
            var name = request.fields.name ;
            var email = request.fields.email ;
            var password = request.fields.password ;
            var reset_token = "" ;
            var isVerified = false ;
            var verification_token = new Date().getTime() ;

            var user = await database.collection("users").findOne({
                "email": email
            }) ;

            if(user == null) {
                bcrypt.hash(password , 10 , async function (error , hash) {
                    await database.collection("users").insertOne({
                        "name": name ,
                        "email": email ,
                        "password": hash ,
                        "resert_token": reset_token ,
                        "uploaded": [] ,
                        "sharedWithMe":[] ,
                        "isVerified": isVerified ,
                        "verification_token": verification_token
                    } , async function(error , data) {

                        var transporter = nodemailer.createTransport(
                            nodemailerObject);
                        var text = "Please verify your account by clicking the following link " +
                        "/verifyEmail/" + email +"/" + verification_token ;

                        var html = "Please verify your account by clicking the following link: <br><br> <a href= '" +
                        mainURL + "/verifyEmail/" + email + "/" + verification_token + "'>Confirm Email</a><br><br>Thank You" ;

                        await transporter.sendMail({
                            from: nodemailerFrom,
                            to: email,
                            subject: "Email Verification" ,
                            text: text,
                            html: html
                        }, function(error , info) {
                            if(error) {
                                console.error(error) ;
                            } else {
                                console.log("Email sent: " + info.response) ;
                            }

                            request.status = "Success" ;
                            request.message = "Signed up successfully.An email has been sent to verify your account" ;

                            result.render("Register" , {
                               "request": request 
                            });

                        });
                    });
                });
            } else{
                request.status = "error" ;
                request.message = "Email already exists" ;

                result.render("Register" , {
                    "request": request
                });
            }
        });
    }
    });
});
