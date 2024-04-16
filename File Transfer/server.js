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
        pass: "pass"
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

        app.get("/verifyEmail/:email/:verification_token" , async function(request,result) {

            var email = request.params.email ;
            var verification_token = request.params.verification_token ;

            var user = await database.collection("users").findOne({
                $and: [{
                    "email": email,
                }, {
                    "verification_token": parseInt(verification_token)
                }]
            });

            if(user == null) {
                request.status = "error";
                request.message = "Email does not exists.Or verification link is expired" ;
                result.render("Login" , {
                    "request": request
                });
            } else {
                await database.collection("users").findOneAndUpdate({
                    $and: [{
                        "email": email,
                    }, {
                        "verification_token": parseInt(
                            verification_token)
                    }]
                }, {
                    $set: {
                        "verification_token": "",
                        "isVerified": true
                    }
                });

                request.status = "success";
                request.message = "Account has been verified.Please try login" ;
                result.render("Login" , {
                    "request": request
                });
            }
        });

        app.get("/Login", function (request, result) {
            result.render("Login", {
                "request": request
            });
        });

        app.post("/Login", async function (request, result) {
            var email = request.fields.email;
            var password = request.fields.password;

            var user = await database.collection("users").findOne({
                "email": email
            });

            if (user == null) {
                request.status = "error";
                request.message = "Email does not exist.";
                result.render("Login", {
                    "request": request
                });
                
                return false;
            }
            bcrypt.compare(password, user.password, function (error, isVerify) {
                if (isVerify) {
                    if(user.isVerified) {   
                        request.session.user = user;
                        result.redirect("/");

                        return false;
                    }
                    
                    request.status = "error";
                    request.message = "Password is not correct.";
                    result.render("Login", {
                        "request": request
                    });
                    return false;
                }
            
                request.status = "error";
                request.message = "Password is not correct" ;
                result.render("Login" , {
                    "request": request
                });
            });
        });

        app.get("/Forgot Password" , function(request,result) {
            result.render("Forgot Password" , {
                "request": request
            });
        });

        app.post("/Send SendRecoveryLink" , async function(request,result) {

            var email = request.fields.email;
            var user = await database.collection("users").findOne({
                "email": email
            });
            if(user == null){
                request.status = "error" ;
                request.message = "Email does not exist" ;

                result.render("ForgotPassword" , {
                    "request":request
                });
                return false ;
            }

            var reset_token = new Date().getTime() ;

            await database.collection("users").findOneAndUpdate({
                "email": email
            } , {
                $set: {
                    "reset_token" : reset_token
                }
            });

            var transporter = nodemailer.createTransport(
                nodemailerObject);
            
            var text = "Please click the following link to reset yor password: " +
            mainURL +"/ResetPassword/" + email +"/" + "reset_token" ;
            var html = "Please click the following link to reset your password: <br><br> <a href= '" +
                        mainURL + "/ResetPassword/" + email + "/" + reset_token + "'>ResetPassword</a><br><br>Thank You" ;
           

            transporter.sendMail({
                from: nodemailerFrom,
                to: email ,
                subject: "Reset Password" ,
                text: text ,
                html: html

            }, function(error , info) {
                if(error) {
                    console.error(error) ;
                } else {
                    console.log("Email sent: " + info.response) ;
                }

                request.status = "Success";
                request.message = "Email has been sent with the link to recover the password" ;
                result.render("ForgotPassword" , {
                    "request": request
                });
            });
        });

        app.get("/ResetPassword/:email/:reset_token" , async function(
            request,result){
                var email = request.params.email;
                var reset_token = request.params.reset_token;

                var user = await database.collection("users").findOne({
                    $and: [{
                        "email": email
                    } , {
                        "reset_token": parseInt(reset_token)
                    }]
                });

                if(user == null) {
                    request.status ="error";
                    request.message = "Link is expired" ;
                    result.render("Error", {
                        "request": request
                    });
                    return false ;
                }
                result.render("ResetPassword" , {
                    "request": request ,
                    "email": email ,
                    "reset_token": reset_token
                });
            });

           app.post("/ResetPassword" , async function(request , result){
            var email = request.fields.email;
            var reset_token = request.fields.reset_token;
            var new_password = request.fields.new_password;
            var confirm_password = request.fields.confirm_password ;

            if(new_password != confirm_password) {
                request.status = "error";
                request.message = "Password does not match" ;

                result.render("ResetPassword" , {
                    "request": request,
                    "email": email,
                    "reset_token": reset_token
                });
                return false ;
            }

            var user = await database.collection("users").findOne({
                $and: [{
                    "email": email
                } , {
                    "reset_token": parseInt(reset_token)
                }]
           });
           if(user == null) {
            request.status = "error" ,
            request.message = "Email does not exist.Or recovery link is expired";

            result.render("ResetPassword" , {
                "request": request,
                "email": email,
                "reset_token": reset_token
            });
            return false ;
           }

           bcrypt.hash(new_password, 10 , async function(error,hash){
            await database.collection("users").findOneAndUpdate({
                $and: [{
                    "email": email ,
                } , {
                    "reset_token": parseInt(reset_token)
                }]
            } , {
                $set: {
                    "reset_token": "" ,
                    "password": hash
                }
            });
            request.status = "Sucess" ,
            request.message = "Password has been changed. Please try login again" ;
            result.render("Login" , {
                "request":request
            });
           });
        });
    }
    });
});
