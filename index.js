const express = require('express')
const mysql = require('mysql')
const session = require('express-session')
const bcrypt = require('bcrypt')
const multer = require('multer')
const xlsx = require('xlsx')
const dotenv = require('dotenv')
const nodemailer = require('nodemailer')
const mysql2 = require('mysql2/promise')

const app = express()

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
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
    database: 'calasoma'
})

const pool = mysql2.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'calasoma'
})

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/profile')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})

const upload = multer({ storage: storage })

app.use((req, res, next) => {
    res.locals.isLogedIn = (req.session.mwalimuID !== undefined)
    next()
})

function loginRequired(req, res) {
    res.locals.isLogedIn || res.redirect('/login')
}

const offensiveWords = ['FUCK', 'SHIT', 'ASSHOLE', 'BITCH', 'DICK', 'CUNT', 'COCK', 'PUSSY', 'SLUT', 'WHORE', 'FAGGOT', 'MOTHERFUCKER', 'NIGGER', 'RETARD', 'TWAT', 'WANKER', 'ASSWIPE', 'BASTARD', 'DAMN', 'GODDAMN', 'ARSE', 'BOLLOCKS', 'BULLSHIT', 'CRAP', 'JACKASS', 'JERK', 'PISS',  'PRICK', 'SCREW', 'SUCK', 'TITS', 'ASSCLOWN', 'DUMBASS', 'FUCKER', 'SHITHEAD', 'ASSFACE', 'ASSHAT', 'CUM', 'DICKHEAD', 'ASSBAG', 'DIPSHIT', 'FUCKFACE', 'MOTHERFUCKING', 'NIGGA',  'SHITHOLE', 'ASSNUGGET', 'BASTARD', 'BLOWJOB', 'COCKSUCKER', 'CUMSLUT', 'DICKBAG', 'DICKWEED', 'DOUCHEBAG', 'FUCKTARD', 'JACKOFF', 'JIZZ', 'MOTHERFUCK', 'NIGGERS', 'PRICKFACE', 'SHITBAG', 'SHITSTAIN', 'TITFUCK', 'WANKSTAIN']

function generateid() {
    const characters = 'ABCDEFGHKMNPQRSTUVWXYZ23456789'
    let genId
    do {
        const randomCharacters = Array.from({ length: 5 }, () => characters.charAt(Math.floor(Math.random() * characters.length)))
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
    const mwalimu = {
        name: 'SHIT',
        email: 'enshikuku@gmail.com',
        password: '2',
        confirmpassword: '2'
    }
    res.render('signup', { error: false, mwalimu: mwalimu })
})

app.post('/signup', async(req, res) => {
    const mwalimu = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmpassword: req.body.confirmpassword
    }
    if (mwalimu.password === mwalimu.confirmpassword) {
        let sql = 'SELECT * FROM mwalimu WHERE email = ?'
        connection.query(sql, [mwalimu.email], (error, results) => {
            if (results.length > 0) {
                let message = 'An account exists with that email number!'
                mwalimu.email = ''
                res.render('signup', { error: true, message: message, mwalimu: mwalimu })
            } else {
                let newId = ''
                let sql = 'SELECT * FROM mwalimu WHERE id = ?'
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

                connection.query(otpsql2, [OTP, mwalimu.email], (error, results) => {
                    if (error) {
                        console.error('Error inserting OTP:', error)
                    } else {
                        const mailData = {
                            from: process.env.EMAIL,
                            to: mwalimu.email,
                            subject: 'Welcome to CALASOMA - Your Personalized Learning Platform',
                            text: `Dear ${mwalimu.name},\n\nWelcome to CALASOMA! Your One-Time Password (OTP) for account verification is ${OTP}. This OTP will expire in 10 minutes.\n\nHappy learning!\n\nBest regards,\nThe CALASOMA Team`
                        }
                        sendMail(mailData)
                        console.log('OTP inserted')
                        res.render('otp', { error: false, mwalimu: mwalimu, newId: newId})
                        setTimeout(() => {
                            const updateSql = 'UPDATE otp SET used = true WHERE otpcode = ?'
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
        mwalimu.confirmpassword = ''
        res.render('signup', { error: true, message: message, mwalimu: mwalimu })
    }
})

app.post('/verify-otp', (req, res) => {
    const mwalimu = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        id: req.body.id,
        otp: req.body.otp
    }
    let sql = 'SELECT * FROM otp WHERE otpcode = ? AND used = false'
    connection.query(sql, [mwalimu.otp], (error, results) => {
        if (results.length > 0) {
            let sql = 'INSERT INTO mwalimu (name, email, password, id) VALUES (?, ?, ?, ?)'
            bcrypt.hash(mwalimu.password, 10, (err, hash) => {
                connection.query(sql, [mwalimu.name, mwalimu.email, hash, mwalimu.id], (error, results) => {
                    req.session.mwalimuID = mwalimu.id
                    res.redirect('/dashboard')
                })
            })
        } else {
            let message = 'Invalid OTP!'
            res.render('otp', { error: true, message: message, mwalimu: mwalimu, newId: mwalimu.id })
        }
    })
})

app.get('/login', (req, res) => {
    const mwalimu = {
        email: '',
        password: ''
    }
    res.render('login', { error: false, mwalimu: mwalimu })
})

app.post('/login', (req, res) => {
    const mwalimu = {
        email: req.body.email,
        password: req.body.password
    }
    let sql = 'SELECT * FROM mwalimu WHERE email = ?'
    connection.query(sql, [mwalimu.email], (error, results) => {
        if (results.length > 0) {
            bcrypt.compare(mwalimu.password, results[0].password, (error, passwordMatches) => {
                if (passwordMatches) {
                    req.session.mwalimuID = results[0].id
                    res.redirect('/dashboard')
                } else {
                    let message = 'Incorrect password!'
                    res.render('login', { error: true, message: message, mwalimu: mwalimu })
                }
            })
        } else {
            let message = 'Account does not exist. Please create one'
            res.render('login', { error: true, message: message, mwalimu: mwalimu })
        }
    })
})

app.get('/dashboard', (req, res) => {
    loginRequired(req, res)
    res.render('dashboard')
})

app.get('/upload', (req, res) => {
    // loginRequired(req, res)
    res.render('upload', {error: false})
})

app.post('/uploadworkbook', upload.single('file'), async (req, res) => {
    let connection
    try {
        const workbook = xlsx.readFile(req.file.path)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 })

        connection = await pool.getConnection()
        await connection.beginTransaction()

        for (let row of data) {
            const [Name, AdmissionNo, Subject1, Subject2, Subject3, Subject4, Subject5, Subject6] = row
            try {
                await connection.query(
                    'INSERT INTO StudentData (Name, AdmissionNo, Subject1, Subject2, Subject3, Subject4, Subject5, Subject6) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [Name, AdmissionNo, Subject1, Subject2, Subject3, Subject4, Subject5, Subject6]
                )
            } catch (error) {
                console.error('Error occurred during insertion:', error)
            }
        }

        await connection.commit()
        res.send('Data uploaded successfully')
    } catch (error) {
        console.error('Error occurred during data insertion:', error)
        res.status(500).send('Error occurred during data insertion')
    } finally {
        if (connection) connection.release()
    }
})

app.get('/logout', (req, res) => {
    loginRequired(req, res)
    req.session.destroy((err) => {
        res.redirect('/')
    })
})

app.get('*', (req, res) => {
    res.render('404')
})

const PORT = process.env.PORT || 3004
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
