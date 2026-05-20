from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure database using environment variables or fallbacks
app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST', 'localhost')   
app.config['MYSQL_PORT'] = int(os.getenv('MYSQL_PORT', 3306))
app.config['MYSQL_USER'] = os.getenv('MYSQL_USER', 'username')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD', 'password')
app.config['MYSQL_DB'] = os.getenv('MYSQL_DB', 'online_test')
app.config['MYSQL_AUTH_PLUGIN'] = os.getenv('MYSQL_AUTH_PLUGIN', '')




# Initialize DB using a temporary connection before creating the pool
try:
    _temp_conn = mysql.connector.connect(
        host=app.config['MYSQL_HOST'],
        port=app.config['MYSQL_PORT'],
        user=app.config['MYSQL_USER'],
        password=app.config['MYSQL_PASSWORD'],
        auth_plugin=app.config['MYSQL_AUTH_PLUGIN'] or 'mysql_native_password'
    )
    _temp_cursor = _temp_conn.cursor()
    _temp_cursor.execute(f"CREATE DATABASE IF NOT EXISTS {app.config['MYSQL_DB']}")
    _temp_cursor.close()
    _temp_conn.close()
    print("Database ensured exists.")
except Error as e:
    print(f"Error ensuring DB exists: {e}")

from mysql.connector import pooling

# Initialize a MariaDB/MySQL connection pool to avoid per-request connection churn.
# This prevents the "creating connection then closing instantly" lifecycle issue.
DB_POOL = pooling.MySQLConnectionPool(
    pool_name="mini_online_test_pool",
    pool_size=5,
    pool_reset_session=True,
    host=app.config['MYSQL_HOST'],
    port=app.config['MYSQL_PORT'],
    user=app.config['MYSQL_USER'],
    password=app.config['MYSQL_PASSWORD'],
    database=app.config['MYSQL_DB'],
    auth_plugin=app.config['MYSQL_AUTH_PLUGIN'] or 'mysql_native_password'
)

def get_db_connection():
    return DB_POOL.get_connection()

# Init table + demo user
def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                score FLOAT DEFAULT 0,
                percentage FLOAT DEFAULT 0,
                detect_object VARCHAR(100) DEFAULT NULL
            )
        """)
        # Add demo user if not exists
        demo_email = 'demo@student.com'
        cursor.execute("SELECT id FROM students WHERE email = %s", (demo_email,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO students (name, email, password, score, percentage) 
                VALUES (%s, %s, %s, 85.5, 92.3)
            """, ('Demo Student', demo_email, generate_password_hash('demo123')))
            print("Demo user added: demo@student.com / demo123")
        conn.commit()
        cursor.close()
        conn.close()
        print("Tables initialized successfully.")
    except Error as e:
        print(f"Error initializing Tables: {e}")

init_db()

# --- API: submit-test ---

@app.route('/api/submit-test', methods=['POST'])
def submit_test():
    try:
        data = request.get_json(silent=True) or {}

        student_id = data.get('student_id')
        test_id = data.get('test_id')
        score = data.get('score')

        if student_id is None or test_id is None or score is None:
            return jsonify({'error': 'student_id, test_id, and score are required'}), 400

        # Basic type normalization
        try:
            student_id = int(student_id)
            test_id = int(test_id)
            score = float(score)
        except (TypeError, ValueError):
            return jsonify({'error': 'student_id and test_id must be integers; score must be a number'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        insert_sql = (
            "INSERT INTO test_submissions (student_id, test_id, score) "
            "VALUES (%s, %s, %s)"
        )
        cursor.execute(insert_sql, (student_id, test_id, score))
        conn.commit()

        submission_id = cursor.lastrowid
        cursor.close()
        conn.close()

        return jsonify({'message': 'Submission recorded', 'submission_id': submission_id}), 201
    except Error as e:
        # mysql-connector-python uses .errno for SQLSTATE-specific errors.
        errno = getattr(e, 'errno', None)
        # Common: duplicate entry / integrity violation
        if errno in (1062, 1452):
            return jsonify({'error': 'Integrity error', 'details': str(e)}), 409
        return jsonify({'error': 'Database error', 'details': str(e)}), 500
    except Exception as e:
        return jsonify({'error': 'Unexpected error', 'details': str(e)}), 500


@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        name = data['name']
        email = data['email']
        password = generate_password_hash(data['password'])

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO students (name, email, password) VALUES (%s, %s, %s)", (name, email, password))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Student registered successfully'}), 201
    except Error as e:
        return jsonify({'error': str(e)}), 400

@app.route('/login', methods=['POST'])
@app.route('/api/login', methods=['POST'])
def login_api():

    try:
        data = request.json
        email = data['email']
        password = data['password']

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM students WHERE email = %s", (email,))
        student = cursor.fetchone()
        cursor.close()
        conn.close()

        if student and check_password_hash(student['password'], password):
            return jsonify({
                'message': 'Login successful',
                'student_id': student['id'],
                'name': student['name'],
                'email': student['email'],
                'score': student['score'],
                'percentage': student['percentage']
            })
        return jsonify({'error': 'Invalid credentials'}), 401
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/student/<email>', methods=['GET'])
def get_student(email):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, score, percentage, detect_object FROM students WHERE email = %s", (email,))
        student = cursor.fetchone()
        cursor.close()
        conn.close()
        if student:
            return jsonify(student)
        return jsonify({'error': 'Student not found'}), 404
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/students', methods=['GET'])
def get_students():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, score, percentage, detect_object FROM students")
        students = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(students)
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/update_score', methods=['POST'])
def update_score():
    try:
        data = request.json
        student_id = data['student_id']
        score = data['score']
        percentage = data['percentage']
        detect_object = data.get('detect_object', None)

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE students SET score = %s, percentage = %s, detect_object = %s WHERE id = %s", (score, percentage, detect_object, student_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Score updated successfully'})
    except Error as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

