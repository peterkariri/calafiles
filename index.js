const express = require('express')
const mysql = require('mysql')
const session = require('express-session')
const bcrypt = require('bcrypt')
const multer = require('multer')
const dotenv = require('dotenv')
const nodemailer = require('nodemailer')
const path = require('path')

const app = express()

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(session({
    secret: 'c@!@$0m@',
    saveUninitialized: false,
    resave: true
}))
dotenv.config()

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'calafiles'
})

const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/profile')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname))
    }
})

const pdfStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/pdf')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname))
    }
})

const uploadProfile = multer({ storage: profileStorage })
const uploadPDF = multer({ storage: pdfStorage })


app.use((req, res, next) => {
    res.locals.username = req.session.username !== undefined ? req.session.username : 'Guest', res.locals.isLogedIn = req.session.userID !== undefined
    next()
})

function loginRequired(req, res) {
    res.locals.isLogedIn || res.redirect('/login')
}

const offensiveWords = ['FUCK', 'SHIT', 'ASSHOLE', 'BITCH', 'DICK', 'CUNT', 'COCK', 'PUSSY', 'SLUT', 'WHORE', 'FAGGOT', 'MOTHERFUCKER', 'NIGGER', 'RETARD', 'TWAT', 'WANKER', 'ASSWIPE', 'BASTARD', 'DAMN', 'GODDAMN', 'ARSE', 'BOLLOCKS', 'BULLSHIT', 'CRAP', 'JACKASS', 'JERK', 'PISS',  'PRICK', 'SCREW', 'SUCK', 'TITS', 'ASSCLOWN', 'DUMBASS', 'FUCKER', 'SHITHEAD', 'ASSFACE', 'ASSHAT', 'CUM', 'DICKHEAD', 'ASSBAG', 'DIPSHIT', 'FUCKFACE', 'MOTHERFUCKING', 'NIGGA',  'SHITHOLE', 'ASSNUGGET', 'BASTARD', 'BLOWJOB', 'COCKSUCKER', 'CUMSLUT', 'DICKBAG', 'DICKWEED', 'DOUCHEBAG', 'FUCKTARD', 'JACKOFF', 'JIZZ', 'MOTHERFUCK', 'NIGGERS', 'PRICKFACE', 'SEX', 'SHITBAG', 'SHITSTAIN', 'TITFUCK', 'WANKSTAIN']

function generateid() {
    const characters = 'ABCDEFGHKMNPQRSTUVWXYZ23456789'
    let genId
    do {
        const randomCharacters = Array.from({ length: 3 }, () => characters.charAt(Math.floor(Math.random() * characters.length)))
        genId = randomCharacters.join('')
    } while (offensiveWords.some(word => genId.includes(word)))
    
    return genId
}

function generatesession() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const genses = Array.from({ length: 10 }, () => characters.charAt(Math.floor(Math.random() * characters.length)))
    return genses.join('')
}

function generateotp() {
    const characters = '1234567890'
    const OTP = Array.from({ length: 4 }, () => characters.charAt(Math.floor(Math.random() * characters.length)))
    return OTP.join('')
}

function checkIfIdExists(id, sql) {
    connection.query(sql, [id], (error, results) => {
        if (results.length > 0) {
            return true
        } else {
            return false
        }
    })
}

const config = {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
}

const sendMail = (data) => {
    const transporter = nodemailer.createTransport(config)
    transporter.sendMail(data, (error, info) => {
        if (error) {
            console.log(error)
        } else {
            console.log('Email sent: ' + info.response)
        }
    })
}

app.get('/', (req, res) => {
    if (req.session.modesession) {
        res.render('index')
        return
    }
    let newId = ''
    let sql = 'SELECT * FROM sessions WHERE sessionid = ?'
    do {
        newId = generatesession()
    } while (checkIfIdExists(newId, sql))
    req.session.modesession = newId
    let sqlsession = 'INSERT INTO sessions (sessionid) VALUES (?)'
    connection.query(sqlsession, [newId], (error, results) => {
        res.render('index')
    })
})

app.get('/signup', (req, res) => {
    const user = {
        name: 'Shikuku',
        email: 'enshikuku@gmail.com',
        password: '2',
        confirmpassword: '2'
    }
    res.render('signup', { error: false, user: user })
})

app.post('/signup', async(req, res) => {
    const user = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmpassword: req.body.confirmpassword
    }
    if (user.password === user.confirmpassword) {
        let sql = 'SELECT * FROM user WHERE email = ?'
        connection.query(sql, [user.email], (error, results) => {
            if (results.length > 0) {
                let message = 'An account exists with that email number!'
                user.email = ''
                res.render('signup', { error: true, message: message, user: user })
            } else {
                let newId = ''
                let sql = 'SELECT * FROM user WHERE id = ?'
                do {
                    newId = generateid()
                } while (checkIfIdExists(newId, sql))

                let OTP = generateotp()
                let otpsql = 'SELECT * FROM otp WHERE otpcode = ?'
                do {
                    OTP = generateotp()
                } while (checkIfIdExists(OTP, otpsql))
                req.session.otp = OTP
                let otpsql2 = 'INSERT INTO otp (otpcode, email) VALUES (?, ?)'

                connection.query(otpsql2, [OTP, user.email], (error, results) => {
                    if (error) {
                        console.error('Error inserting OTP:', error)
                    } else {
                        const mailData = {
                            from: process.env.EMAIL,
                            to: user.email,
                            subject: 'Welcome to calafiles - Your Personalized Learning Platform',
                            text: `Dear ${user.name},\n\nWelcome to calafiles! Your One-Time Password (OTP) for account verification is ${OTP}. This OTP will expire in 10 minutes.\n\nHappy learning!\n\nBest regards,\nThe calafiles Team`
                        }
                        sendMail(mailData)
                        console.log('OTP inserted')
                        res.render('otp', { error: false, user: user, newId: newId})
                        setTimeout(() => {
                            const updateSql = 'UPDATE otp SET used = "true" WHERE otpcode = ?'
                            connection.query(updateSql, [OTP], (updateError, updateResults) => {
                                if (updateError) {
                                    console.error('Error updating OTP status:', updateError)
                                } else {
                                    console.log('OTP status updated to true')
                                }
                            })
                        }, 10 * 60 * 1000)
                    }
                })
            }
        })
    } else {
        let message = 'Passwords don\'t match!'
        user.confirmpassword = ''
        res.render('signup', { error: true, message: message, user: user })
    }
})

app.post('/verify-otp', (req, res) => {
    const user = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        id: req.body.id,
        otp: req.body.otp
    }
    let sql = 'SELECT * FROM otp WHERE otpcode = ? AND used = "false"'
    connection.query(sql, [user.otp], (error, results) => {
        if (results.length > 0) {
            let sql = 'INSERT INTO user (name, email, password, id) VALUES (?, ?, ?, ?)'
            bcrypt.hash(user.password, 10, (err, hash) => {
                connection.query(sql, [user.name, user.email, hash, user.id], (error, results) => {
                    req.session.userID = user.id
                    req.session.username = user.name.split(' ')[0]
                    res.redirect('/dashboard')
                })
            })
        } else {
            let message = 'Invalid OTP!'
            res.render('otp', { error: true, message: message, user: user, newId: user.id })
        }
    })
})

app.get('/login', (req, res) => {
    const user = {
        email: '',
        password: ''
    }
    res.render('login', { error: false, user: user })
})

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }
    let sql = 'SELECT * FROM user WHERE email = ?'
    connection.query(sql, [user.email], (error, results) => {
        if (results.length > 0) {
            bcrypt.compare(user.password, results[0].password, (error, passwordMatches) => {
                if (passwordMatches) {
                    req.session.userID = results[0].id
                    req.session.username = results[0].name.split(' ')[0]
                    res.redirect('/dashboard')
                } else {
                    let message = 'Incorrect password!'
                    res.render('login', { error: true, message: message, user: user })
                }
            })
        } else {
            let message = 'Account does not exist. Please create one'
            res.render('login', { error: true, message: message, user: user })
        }
    })
})

app.get('/dashboard', (req, res) => {
    loginRequired(req, res)
    res.render('dashboard')
})

app.get('/notes', (req, res) => {
    // loginRequired(req, res)
    let sql = 'SELECT * FROM pdf WHERE isactive = ?'
    connection.query(
        sql,
        ['active'],
        (error, results) => {
            res.render('notes', {pdf: results})
        }
    )
})

app.get('/preview/:filename', (req, res) => {
    // loginRequired(req, res)
    let filename = req.params.filename
    let sql = 'SELECT * FROM pdf WHERE filename = ?'
    connection.query(
        sql,
        [filename],
        (error, results) => {
            res.render('preview', {file: results[0]})
        }
    )
})

app.get('/add-pdf', (req, res) => {
    res.render('add-pdf', {error: false})
})

app.post('/upload-pdf', uploadPDF.single('pdf'), (req, res) => {
    const pdf = {
        title: req.body.title,
        def: req.body.definition,
        filename: req.file.filename
    }
    let sql = 'INSERT INTO pdf (title, filename, def) VALUES (?, ?, ?)'
    connection.query(
        sql,
        [pdf.title, pdf.filename, pdf.def],
        (error, results) => {
            res.redirect('/notes')
        }
    )
})

app.get('/logout', (req, res) => {
    loginRequired(req, res)
    req.session.destroy((err) => {
        res.redirect('/')
    })
})

// app.get('*', (req, res) => {
    // res.render('404')
// })

const PORT = process.env.PORT || 311
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
