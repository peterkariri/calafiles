CREATE TABLE otp (
id INT(11) AUTO_INCREMENT PRIMARY KEY,
otpcode VARCHAR(10),
timestamp TIMESTAMP,
used VARCHAR(10) DEFAULT 'false',
email VARCHAR(255)
);

CREATE TABLE sessions (
id INT(11) AUTO_INCREMENT PRIMARY KEY,
sessionid VARCHAR(10),
timestamp TIMESTAMP,
isactive VARCHAR(10) DEFAULT 'active'
);

CREATE TABLE user (
id VARCHAR(20) PRIMARY KEY,
name VARCHAR(100),
email VARCHAR(100),
password VARCHAR(100),
isactive VARCHAR(20)
);

CREATE TABLE pdf (
id INT(11) AUTO_INCREMENT PRIMARY KEY,
title VARCHAR(255),
filename VARCHAR(255),
def LONGTEXT,
remarks TEXT,
opened INT(11),
added_by VARCHAR(255),
isactive VARCHAR(10) DEFAULT 'active',
timestamp TIMESTAMP
);

CREATE TABLE pdf (
id INT(11) AUTO_INCREMENT PRIMARY KEY,
title VARCHAR(255),
filename VARCHAR(255),
def LONGTEXT,
remarks TEXT,
opened INT(11),
added_by VARCHAR(255),
isactive VARCHAR(10) DEFAULT 'active',
timestamp TIMESTAMP
);

CREATE TABLE chatroom (
message_id INT AUTO_INCREMENT PRIMARY KEY,
user_id VARCHAR(20),
message TEXT,
timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES user(id)
);


