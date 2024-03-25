# Running CALASOMA Locally

To run CALASOMA on your machine, follow these steps:

## Prerequisites
- Node.js installed on your machine
- MySQL server installed and running

## Installation
1. Clone the CALASOMA repository from GitHub:
   ```
   git clone https://github.com/enshikuku/CALASOMA.git
   ```

2. Navigate to the project directory:
   ```
   cd CALASOMA
   ```

3. Install dependencies using npm:
   ```
   npm install express mysql express-session bcrypt multer dotenv nodemailer nodemon ejs.
   ```

4. Set up your MySQL database:
   - Create a database named `calasoma`
   - Create the necessary database tables using the queries provided in DB_QUERIES.md. [Click here to view them](DB_QUERIES.md)

## Running the App
- To start the application, run:
  ```
  npm start
  ```

- Open your web browser and visit `http://localhost:3009` to access the CALASOMA application.

## Directory Structure
After cloning the repository, you'll find the following directory structure:
- `.gitignore`
- `README.md`: Contains instructions for running the project locally.
- `index.js`: Main entry point of the application.
- `package-lock.json`: Auto-generated file for npm dependencies.
- `package.json`: File containing project metadata and dependencies.
- `public/`: Directory for static files like CSS, JavaScript, and images.
- `views/`: Directory containing EJS templates for rendering views.
  - `index.ejs`: Homepage template.
  - `partials/`: Directory for partial templates.

Now you're ready to run CALASOMA locally on your machine!

Roles to be divided soon!