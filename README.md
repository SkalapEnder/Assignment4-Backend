# Assignment 4 | Alisher Berik | IT-2308

This assignment is about Space. 
#### The secret code for admin is 'admin1243'

## Deployment

The server was deployed on Render's website. Click next link to move:

[https://assignment4-backend-y45w.onrender.com](https://assignment4-backend-y45w.onrender.com)


## Demo

Instruction to use website

### Login & Registration

First of all, you need to create account. 

#### 1) Move to "Log In" link on Navbar.

#### 2) Then click "Create new accout".

#### 3) There you write name, email, password and your role. 
  If you want to be admin, write code that I send you in teams!

#### 4) After Registration, you will move to log in. Again, write your username and password.

### GPU Part

There you can search GPUs from dataset and Amazon

#### 1) Type your GPU

#### 2) Choose one.

#### 3) Click search to find in Amazon.


### News Part

On each card of news, you have 2 buttons:

#### 1) Read more - move you to real news page

#### 2) Add to favorites - move specific news to favorite storage. There you can store your news.

#### 3) Below, you will see that news articles was paginated into several pages.


## Installation

Install my-project with npm

```bash
  npm install my-project
  cd my-project
```

Extract GitHub repository to my-project folder.

Next, Open project folder in IDE.

Then, open terminal of IDE and write next commands

```bash
  npm i axios express express-session express-validator passport passport-local connect-flash cookie-parser mailersend mongoose mongodb axios body-parser ejs nodemon bcryptjs
```

Finally, start local server by next commands

```bash
  nodemon index
```
    
## Documentation

There I numerate used libraries

### Used libraries
1. Nodemon - automatically update server if detects any changes in files
2. Express - build more flexible web application
3. Express Session - create user's session to keep its data (ID, username)
4. Mongoose - library to connect with MongoDB Atlas
5. BcryptJs - hashing user password
6. Axios - request and response part
7. Body Parser - extended JSON Parser
8. EJS - allows to use JS script in HTML, include templates and so on.
9. Cookie Parser
10. Passport & Passport Local - for authentification
11. Mailer Send - to send messages to user's email
12. Express Validator - validate email and password strength

### Used APIs
