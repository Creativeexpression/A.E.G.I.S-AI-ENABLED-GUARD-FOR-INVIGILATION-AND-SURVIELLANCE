
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

# Optional MySQL support if available and configured
mysql = None
mysql_error = None
try:
    import mysql.connector
    from mysql.connector import Error
    from mysql.connector import pooling
    mysql = mysql.connector
except Exception as exc:
    mysql_error = exc

# Load environment variables from .env file
load_dotenv()

STATIC_FOLDER = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='')
CORS(app)

# Configure database using environment variables or fallbacks
app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST', 'localhost')
app.config['MYSQL_PORT'] = int(os.getenv('MYSQL_PORT', 3306))
app.config['MYSQL_USER'] = os.getenv('MYSQL_USER', 'username')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD', 'password')
app.config['MYSQL_DB'] = os.getenv('MYSQL_DB', 'online_test')
app.config['MYSQL_AUTH_PLUGIN'] = os.getenv('MYSQL_AUTH_PLUGIN', '')
app.config['USE_SQLITE'] = os.getenv('USE_SQLITE', 'true').lower() in ('1', 'true', 'yes')

SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), 'database.sqlite3')
DB_TYPE = 'sqlite'
DB_POOL = None


def to_param_style(sql):
    if DB_TYPE == 'sqlite':
        return sql.replace('%s', '?')
    return sql


def dict_cursor(conn):
    if DB_TYPE == 'mysql':
        return conn.cursor(dictionary=True)
    conn.row_factory = sqlite3.Row
    return conn.cursor()


def row_to_dict(row):
    if row is None:
        return None
    if isinstance(row, dict):
        return row
    return dict(row)


def fetch_all_rows(cursor):
    rows = cursor.fetchall()
    return [row_to_dict(row) for row in rows]


def fetch_single_row(cursor):
    return row_to_dict(cursor.fetchone())


def create_sqlite_connection():
    conn = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def get_db_connection():
    if DB_TYPE == 'mysql':
        return DB_POOL.get_connection()
    return create_sqlite_connection()


def configure_mysql_pool():
    global DB_POOL, DB_TYPE
    if mysql is None:
        raise RuntimeError('mysql.connector is not installed')

    _temp_conn = mysql.connect(
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

    DB_POOL = pooling.MySQLConnectionPool(
        pool_name='mini_online_test_pool',
        pool_size=5,
        pool_reset_session=True,
        host=app.config['MYSQL_HOST'],
        port=app.config['MYSQL_PORT'],
        user=app.config['MYSQL_USER'],
        password=app.config['MYSQL_PASSWORD'],
        database=app.config['MYSQL_DB'],
        auth_plugin=app.config['MYSQL_AUTH_PLUGIN'] or 'mysql_native_password'
    )
    DB_TYPE = 'mysql'

def init_db():
    global DB_TYPE
    if not app.config['USE_SQLITE']:
        try:
            configure_mysql_pool()
            print('MySQL database configured successfully.')
        except Exception as exc:
            print('Could not connect to MySQL; falling back to SQLite:', exc)
            DB_TYPE = 'sqlite'
    else:
        DB_TYPE = 'sqlite'

    conn = get_db_connection()
    cursor = conn.cursor()

    if DB_TYPE == 'mysql':
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                score FLOAT DEFAULT 0,
                percentage FLOAT DEFAULT 0,
                detect_object VARCHAR(100) DEFAULT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS test_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                test_id INT NOT NULL,
                score FLOAT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                score REAL DEFAULT 0,
                percentage REAL DEFAULT 0,
                detect_object TEXT DEFAULT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS test_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                test_id INTEGER NOT NULL,
                score REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

    demo_email = 'demo@student.com'
    cursor.execute(to_param_style('SELECT id FROM students WHERE email = %s'), (demo_email,))
    if cursor.fetchone() is None:
        cursor.execute(
            to_param_style('INSERT INTO students (name, email, password, score, percentage) VALUES (%s, %s, %s, 85.5, 92.3)'),
            ('Demo Student', demo_email, generate_password_hash('demo123'))
        )
        print('Demo user added: demo@student.com / demo123')

    conn.commit()
    cursor.close()
    conn.close()
    print(f'Tables initialized successfully using {DB_TYPE}.')


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

        try:
            student_id = int(student_id)
            test_id = int(test_id)
            score = float(score)
        except (TypeError, ValueError):
            return jsonify({'error': 'student_id and test_id must be integers; score must be a number'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        insert_sql = to_param_style('INSERT INTO test_submissions (student_id, test_id, score) VALUES (%s, %s, %s)')
        cursor.execute(insert_sql, (student_id, test_id, score))
        conn.commit()

        submission_id = cursor.lastrowid
        cursor.close()
        conn.close()

        return jsonify({'message': 'Submission recorded', 'submission_id': submission_id}), 201
    except Exception as e:
        return jsonify({'error': 'Unexpected error', 'details': str(e)}), 500


@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get('name')
        email = data.get('email')
        password_raw = data.get('password')

        if not name or not email or not password_raw:
            return jsonify({'error': 'Name, email, and password are required fields.'}), 400

        name = name.strip()
        email = email.strip()
        password = generate_password_hash(password_raw)

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(to_param_style('SELECT id FROM students WHERE email = %s'), (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Email is already registered.'}), 409

        cursor.execute(
            to_param_style('INSERT INTO students (name, email, password) VALUES (%s, %s, %s)'),
            (name, email, password)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Student registered successfully'}), 201
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@app.route('/login', methods=['POST'])
@app.route('/api/login', methods=['POST'])
def login_api():
    try:
        data = request.json
        email = data['email']
        password = data['password']

        conn = get_db_connection()
        cursor = dict_cursor(conn)
        cursor.execute(to_param_style('SELECT * FROM students WHERE email = %s'), (email,))
        student = fetch_single_row(cursor)
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
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/student/<email>', methods=['GET'])
def get_student(email):
    try:
        conn = get_db_connection()
        cursor = dict_cursor(conn)
        cursor.execute(to_param_style('SELECT id, name, email, score, percentage, detect_object FROM students WHERE email = %s'), (email,))
        student = fetch_single_row(cursor)
        cursor.close()
        conn.close()
        if student:
            return jsonify(student)
        return jsonify({'error': 'Student not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/students', methods=['GET'])
def get_students():
    try:
        conn = get_db_connection()
        cursor = dict_cursor(conn)
        cursor.execute(to_param_style('SELECT id, name, email, score, percentage, detect_object FROM students'))
        students = fetch_all_rows(cursor)
        cursor.close()
        conn.close()
        return jsonify(students)
    except Exception as e:
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
        cursor.execute(
            to_param_style('UPDATE students SET score = %s, percentage = %s, detect_object = %s WHERE id = %s'),
            (score, percentage, detect_object, student_id)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Score updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
