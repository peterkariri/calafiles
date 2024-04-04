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
    res.locals.username = req.session.username !== undefined ? req.session.username : 'Guest'
    res.locals.isLoggedIn = req.session.userID !== undefined
    res.locals.userID = req.session.userID
    res.locals.tutor = req.session.tutor !== undefined ? req.session.tutor : false
    next()
})



function loginRequired(req, res) {
    res.locals.isLoggedIn || res.redirect('/login')
}

const offensiveWords = ['FUCK', 'SHIT', 'ASSHOLE', 'ASS', 'BITCH', 'DICK', 'CUNT', 'COCK', 'PUSSY', 'SLUT', 'WHORE', 'FAGGOT', 'MOTHERFUCKER', 'NIGGER', 'RETARD', 'TWAT', 'WANKER', 'ASSWIPE', 'BASTARD', 'DAMN', 'GODDAMN', 'ARSE', 'BOLLOCKS', 'BULLSHIT', 'CRAP', 'JACKASS', 'JERK', 'PISS',  'PRICK', 'SCREW', 'SUCK', 'TITS', 'ASSCLOWN', 'DUMBASS', 'FUCKER', 'SHITHEAD', 'ASSFACE', 'ASSHAT', 'CUM', 'DICKHEAD', 'ASSBAG', 'DIPSHIT', 'FUCKFACE', 'MOTHERFUCKING', 'NIGGA',  'SHITHOLE', 'ASSNUGGET', 'BASTARD', 'BLOWJOB', 'COCKSUCKER', 'CUMSLUT', 'DICKBAG', 'DICKWEED', 'DOUCHEBAG', 'FUCKTARD', 'JACKOFF', 'JIZZ', 'MOTHERFUCK', 'NIGGERS', 'PRICKFACE', 'SEX', 'SHITBAG', 'SHITSTAIN', 'TITFUCK', 'WANKSTAIN']

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
        name: '',
        email: '',
        password: '',
        confirmpassword: ''
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
                            subject: 'Welcome to CALAFILES - Your Personalized Learning Platform',
                            text: `Dear ${user.name},\n\nWelcome to CALAFILES! Your One-Time Password (OTP) for account verification is ${OTP}. This OTP will expire in 10 minutes.\n\nHappy learning!\n\nBest regards,\nThe CALAFILES Team`
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
    let sqlSelect = 'SELECT * FROM otp WHERE otpcode = ? AND used = "false"'
    connection.query(sqlSelect, [user.otp], (error, results) => {
        if (results.length > 0) {
            let sqlInsert = 'INSERT INTO user (name, email, password, id) VALUES (?, ?, ?, ?)'
            bcrypt.hash(user.password, 10, (err, hash) => {
                connection.query(sqlInsert, [user.name, user.email, hash, user.id], (error, results) => {
                    if (error) {
                        console.error('Error inserting user:', error)
                        return res.status(500).send('Error inserting user')
                    }
                    let sqlUpdate = 'UPDATE otp SET used = "true" WHERE otpcode = ?'
                    connection.query(sqlUpdate, [user.otp], (error, results) => {
                        if (error) {
                            console.error('Error updating OTP:', error)
                            return res.status(500).send('Error updating OTP')
                        }
                        const mailData = {
                            from: process.env.EMAIL,
                            to: user.email,
                            subject: 'Welcome to CALAFILES - Your Personalized Learning Platform',
                            text: `Dear ${user.name},\n\nWelcome to CALAFILES! Your account has been successfully created. Start your personalized learning journey today.\n\nIf you have any questions or need assistance, feel free to reach out to our support team.\n\nHappy learning!\n\nBest regards,\nThe CALAFILES Team`
                        }
                        sendMail(mailData)
                        req.session.userID = user.id
                        req.session.username = user.name.split(' ')[0]
                        res.redirect('/dashboard')
                    })
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
    loginRequired(req, res)
    let sql = 'SELECT pdf.*, downloaded.user_id, downloaded.download_date FROM pdf LEFT JOIN downloaded ON pdf.id = downloaded.pdf_id AND downloaded.user_id = ? WHERE pdf.isactive = ? ORDER BY downloaded.user_id IS NULL DESC'
    connection.query(
        sql,
        [
            req.session.userID,
            'active'
        ],
        (error, pdf) => {
            res.render('notes', {pdf: pdf})
        }
    )
})

app.post('/done', (req, res) => {
    loginRequired(req, res)
    const item = {
        pdf: req.body.file_id,
        user: req.body.user_id
    }
    let sql = 'INSERT INTO downloaded (user_id, pdf_id) VALUES (?, ?)'
    connection.query(
        sql,
        [item.user, item.pdf],
        (error, results) => {
            let sql = 'SELECT * FROM pdf'
            connection.query(
                sql,
                (error, pdf) => {
                    let totalpdf = pdf.length
                    let sql = 'SELECT * FROM downloaded WHERE user_id = ?'
                    connection.query(
                        sql,
                        [req.session.userID],
                        (error, downloaded) => {
                            let read = downloaded.length
                            let progress = (read / totalpdf) * 100
                            let sql = 'UPDATE user SET progress = ? WHERE id = ?'
                            connection.query(
                                sql,
                                [progress, req.session.userID],
                                (error, results) => {
                                    res.redirect('/notes')
                                }
                            )
                        }
                    )
                }
            )
        }
    )
})

app.post('/undo', (req, res) => {
    loginRequired(req, res)
    const item = {
        pdf: req.body.file_id,
        user: req.body.user_id
    }
    let sql = 'DELETE FROM downloaded WHERE user_id = ? AND pdf_id = ?'
    connection.query(
        sql,
        [
            item.user, 
            item.pdf
        ],
        (error, results) => {
            let sql = 'SELECT * FROM pdf'
            connection.query(
                sql,
                (error, pdf) => {
                    let totalpdf = pdf.length
                    let sql = 'SELECT * FROM downloaded WHERE user_id = ?'
                    connection.query(
                        sql,
                        [req.session.userID],
                        (error, downloaded) => {
                            let read = downloaded.length
                            let progres = (read / totalpdf) * 100
                            let progress = progres.toFixed(2)
                            let sql = 'UPDATE user SET progress = ? WHERE id = ?'
                            connection.query(
                                sql,
                                [progress, req.session.userID],
                                (error, results) => {
                                    res.redirect('/notes')
                                }
                            )
                        }
                    )
                }
            )
        }
    )
})

app.get('/preview/:filename', (req, res) => {
    loginRequired(req, res)
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

app.get('/chatroom', (req, res) => {
    loginRequired(req, res)
    let sql = 'SELECT chatroom.message, chatroom.timestamp, chatroom.user_id, user.name, user.tutor FROM chatroom JOIN user ON chatroom.user_id = user.id ORDER BY chatroom.timestamp DESC'
    connection.query(
        sql,
        (error, results) => {
            res.render('chatroom', {messages: results, error: false})
        }
    )
})

app.post('/send-message', (req, res) => {
    loginRequired(req, res)
    const message = {
        user: req.session.userID,
        content: req.body.message
    }
    let sql = 'INSERT INTO chatroom (user_id, message) VALUES (?, ?)'
    connection.query(
        sql,
        [message.user, message.content],
        (error, results) => {
            res.redirect('/chatroom')
        }
    )
})

app.get('/progress', (req, res) => {
    loginRequired(req, res)
    let sql = 'SELECT * FROM user WHERE id = ?'
    connection.query(
        sql,
        [req.session.userID],
        (error, results) => {
            res.render('progress', {user: results[0]})
        }
    )
})

app.get('/edit-user', (req, res) => {
    loginRequired(req, res)
    let sql = 'SELECT * FROM user WHERE id = ?'
        connection.query(
            sql,
            [req.session.userID],
            (error, results) => {
                res.render('edit-user', {user: results[0], error: false})
            }
        )
})

app.post('/update-profile', uploadProfile.single('profilepicture'), (req, res) => {
    loginRequired(req, res)
    const user = {
        name: req.body.name,
        email: req.body.email,
        profile: req.file.filename
    }
    let sql = 'SELECT email FROM user WHERE id = ?'
    connection.query(
        sql,
        [req.session.userID],
        (error, results) => {
            if (results[0].email === user.email) {
                let sql = 'UPDATE user SET name = ?, profilepicture = ? WHERE id = ?'
                connection.query(
                    sql,
                    [user.name, user.profile, req.session.userID],
                    (error, results) => {
                        res.redirect('/progress')
                    }
                )
            } else {
                let sql = 'SELECT * FROM user WHERE email = ?'
                connection.query(sql, [user.email], (error, results) => {
                    if (results.length > 0) {
                        let message = 'An account exists with that email number!'
                        res.render('edit-user', { error: true, message: message, user: user })
                    } else {
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
                                    subject: 'Verify Your New Email Address for CALAFILES',
                                    text: `Dear ${user.name},\n\nThank you for updating your email address on CALAFILES. Please use the following One-Time Password (OTP) to verify your new email address: ${OTP}. This OTP will expire in 10 minutes.\n\nIf you didn't request this change, please ignore this email.\n\nBest regards,\nThe CALAFILES Team`
                                }
                                sendMail(mailData)
                                console.log('OTP inserted')
                                res.render('otp-update', { error: false, user: user})
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
            }
        }
    )
})

app.post('/verify-email-otp', (req, res) => {
    loginRequired(req, res)
    const user = {
        name: req.body.name,
        email: req.body.email,
        profile: req.body.profile,
        otp: req.body.otp
    }
    let sqlSelect = 'SELECT * FROM otp WHERE otpcode = ? AND used = "false"'
    connection.query(sqlSelect, [user.otp], (error, results) => {
        if (results.length > 0) {
            let sql = 'UPDATE user SET name = ?, email = ?, profilepicture = ? WHERE id = ?'
            connection.query(
                sql,
                [user.name, user.email, user.profile, req.session.userID],
                (error, results) => {
                    let sqlUpdate = 'UPDATE otp SET used = "true" WHERE otpcode = ?'
                    connection.query(sqlUpdate, [user.otp], (error, results) => {
                        if (error) {
                            console.error('Error updating OTP:', error)
                            return res.status(500).send('Error updating OTP')
                        }
                        const mailData = {
                            from: process.env.EMAIL,
                            to: user.email,
                            subject: 'Profile Update Confirmation - CALAFILES',
                            text: `Dear ${user.name},\n\nYour CALAFILES profile has been successfully updated. Thank you for keeping your information current.\n\nIf you have any further questions or need assistance, feel free to contact our support team.\n\nBest regards,\nThe CALAFILES Team`
                        }
                        sendMail(mailData)
                        res.redirect('/progress')
                    })
                }
            )
        } else {
            let message = 'Invalid OTP!'
            res.render('otp', { error: true, message: message, user: user, newId: user.id })
        }
    })
})



app.get('/admin', (req, res) => {
    loginRequired(req, res)
    const user = {
        email: '',
        password: ''
    }
    let sql = 'SELECT tutor FROM user WHERE id = ?'
    connection.query(
        sql,
        [req.session.userID],
        (error, results) => {
            if (results[0].tutor === 1) {
                let sql = 'SELECT * FROM user'
                connection.query(
                    sql,
                    (error, results) => {
                        res.render('manager', {error: false, users: results})
                    }
                )
            } else {
                res.render('admin', {user: user, error: false})
            }
        }
    )
})

app.post('/admin', (req, res) => {
    loginRequired(req, res)
    const user = {
        email: req.body.email,
        password: req.body.password
    }
    let sql = 'SELECT * FROM user WHERE email = ?'
    connection.query(sql, [user.email], (error, results) => {
        if (results.length > 0) {
            if (user.password === process.env.ADMINPASSCODE) {
                let sql = 'UPDATE user SET tutor = true WHERE id = ?'
                connection.query(
                    sql,
                    [req.session.userID],
                    (error, results) => {
                        req.session.tutor = true
                        res.redirect('/manager')
                    }
                )
            } else {
                let message = 'Wrong Admin Passcode'
                res.render('admin', {error: true, user: user, message: message})
            }
        } else {
            res.redirect('/logout')
        }
    })
})

app.get('/manager', (req, res) => {
    loginRequired(req, res)
    let sql = 'SELECT tutor FROM user WHERE id = ?'
    connection.query(
        sql,
        [req.session.userID],
        (error, results) => {
            if (results[0].tutor === 1) {
                let sql = 'SELECT * FROM user'
                connection.query(
                    sql,
                    (error, results) => {
                        req.session.tutor = true
                        res.render('manager', {error: false, users: results})
                    }
                )
            } else {
                res.redirect('/notes')
            }
        }
    )
})

// make admin 
app.post('/makeadmin/:id', (req, res) => {
    loginRequired(req, res)
    let id = req.params.id
    let sessionLiveAdmin = req.session.userID
    if (id === sessionLiveAdmin) {
        connection.query(
            'SELECT * FROM user',
            [],
            (error, results) => {
                let message = 'You cannot make yourself admin'
                res.render('manager', { error: true, message: message, users: results })
            }
        )
    } else {
        connection.query (
            "UPDATE user SET tutor = true WHERE id = ?",
            [id],
            (error, results) => {
                if (error) {
                    console.error("Error activating admin:", error)
                    res.status(500).send("Error activating admin")
                } else {
                    res.redirect('/manager')
                }
            }
        )
    }
})


// unmake admin 
app.post('/unmakeadmin/:id', (req, res) => {
    loginRequired(req, res)
    let id = req.params.id
    let sessionLiveAdmin = req.session.userID
    if (id === sessionLiveAdmin) {
        connection.query(
            'SELECT * FROM user',
            [],
            (error, results) => {
                let message = 'You cannot unmake yourself as admin'
                res.render('manager', { error: true, message: message, users: results })
            }
        )
    } else {
        connection.query (
            "UPDATE user SET tutor = false WHERE id = ?",
            [id],
            (error, results) => {
                if (error) {
                    console.error("Error activating admin:", error)
                    res.status(500).send("Error activating admin")
                } else {
                    res.redirect('/manager')
                }
            }
        )
    }
})

// activate 
app.post('/activateuser/:id', (req, res) => {
    loginRequired(req, res)
    let id = req.params.id
    let sessionLiveAdmin = req.session.userID
    if (id === sessionLiveAdmin) {
        connection.query(
            'SELECT * FROM user',
            [],
            (error, results) => {
                let message = 'You cannot activate yourself'
                res.render('manager', { error: true, message: message, users: results })
            }
        )
    } else {
        connection.query (
            "UPDATE user SET isactive = 'active' WHERE id = ?",
            [id],
            (error, results) => {
                if (error) {
                    console.error("Error activating admin:", error)
                    res.status(500).send("Error activating admin")
                } else {
                    res.redirect('/manager')
                }
            }
        )
    }
})

// deactivate user
app.post('/deactivateuser/:id', (req, res) => {
    loginRequired(req, res)
    let id = req.params.id
    let sessionLiveAdmin = req.session.userID
    if (id === sessionLiveAdmin) {
        connection.query(
            'SELECT * FROM user',
            [],
            (error, results) => {
                let message = 'You cannot deactivate yourself'
                res.render('manager', { error: true, message: message, users: results })
            }
        )
    } else {
        connection.query (
            "UPDATE user SET isactive = 'inactive' WHERE id = ?",
            [req.params.id],
            (error, results) => {
                if (error) {
                    console.error("Error deactivating admin:", error)
                    res.status(500).send("Error deactivating admin")
                } else {
                    res.redirect('/manager')
                }
            }
        )
    }
})


app.get('/add-pdf', (req, res) => {
    loginRequired(req, res)
    if (req.session.tutor) {
        res.render('add-pdf', {error: false})
    } else {
        res.redirect('/notes')
    }
})

app.post('/upload-pdf', uploadPDF.single('pdf'), (req, res) => {
    loginRequired(req, res)
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

app.get('*', (req, res) => {
    res.render('404')
})

const PORT = process.env.PORT || 311
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
