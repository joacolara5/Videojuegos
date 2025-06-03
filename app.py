from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from sqlalchemy.orm import sessionmaker
from backend.database import engine
from backend.models import Usuario, VideoGameSale
import os

app = Flask(__name__, template_folder='frontend')
app.secret_key = os.environ.get("SECRET_KEY", "dev_key_fallback")

# Crear sesión SQLAlchemy
Session = sessionmaker(bind=engine)
db_session = Session()

# Configurar LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth'

@login_manager.user_loader
def load_user(user_id):
    return db_session.query(Usuario).get(int(user_id))

# --- Rutas principales ---

@app.route('/')
def home():
    return redirect(url_for('auth'))

@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        action = request.form.get('action')
        username = request.form.get('username').strip().lower()
        password = request.form.get('password')

        if action == 'register':
            if db_session.query(Usuario).filter(Usuario.username == username).first():
                flash('El usuario ya existe', 'danger')
            else:
                new_user = Usuario(username=username)
                new_user.set_password(password)
                try:
                    db_session.add(new_user)
                    db_session.commit()
                    flash('Usuario creado exitosamente', 'success')
                    return redirect(url_for('auth'))
                except Exception as e:
                    db_session.rollback()
                    flash('Error al registrar usuario: ' + str(e), 'danger')

        elif action == 'login':
            user = db_session.query(Usuario).filter(Usuario.username == username).first()
            if user and user.check_password(password):
                login_user(user)
                flash('Sesión iniciada exitosamente', 'success')
                return redirect(url_for('dashboard'))
            else:
                flash('Usuario o contraseña incorrectos', 'danger')

    return render_template('auth.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username=current_user.username)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth'))

# --- API para videojuegos ---

@app.route('/api/video_games')
def api_video_games():
    try:
        # Obtener parámetros de filtro
        platform = request.args.get('platform')
        genre = request.args.get('genre')
        year = request.args.get('year')
        
        # Construir consulta
        query = db_session.query(VideoGameSale)
        
        # Aplicar filtros
        if platform:
            query = query.filter(VideoGameSale.platform == platform)
        if genre:
            query = query.filter(VideoGameSale.genre == genre)
        if year:
            try:
                query = query.filter(VideoGameSale.year == int(year))
            except ValueError:
                return jsonify({"error": "El año debe ser un número"}), 400
        
        # Ejecutar consulta
        data = query.all()
        
        # Formatear respuesta
        juegos = [{
            "id": j.id,
            "Name": j.name,
            "Platform": j.platform,
            "Year": j.year,
            "Genre": j.genre,
            "Publisher": j.publisher,
            "NA_Sales": j.na_sales,
            "EU_Sales": j.eu_sales,
            "JP_Sales": j.jp_sales,
            "Other_Sales": j.other_sales,
            "Global_Sales": j.global_sales
        } for j in data]
        
        return jsonify(juegos)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/filtros', methods=['GET'])
def obtener_filtros():
    plataforma = request.args.getlist('plataforma')
    genero = request.args.getlist('genero')
    anio = request.args.getlist('anio')
    editor = request.args.getlist('editor')

    query = db_session.query(VideoGameSale)
    if plataforma:
        query = query.filter(VideoGameSale.platform.in_(plataforma))
    if genero:
        query = query.filter(VideoGameSale.genre.in_(genero))
    if anio:
        query = query.filter(VideoGameSale.year.in_(anio))
    if editor:
        query = query.filter(VideoGameSale.publisher.in_(editor))

    data = query.all()

    return jsonify({
        'plataformas': sorted({v.platform for v in data if v.platform}),
        'generos': sorted({v.genre for v in data if v.genre}),
        'anios': sorted({v.year for v in data if v.year}),
        'editores': sorted({v.publisher for v in data if v.publisher}),
    })

@app.route('/api/list_video_games')
def api_list_video_games():
    data = db_session.query(VideoGameSale).all()
    juegos = [ {
        "id": j.id,
        "Name": j.name,
        "Platform": j.platform,
        "Year": j.year,
        "Genre": j.genre,
        "Publisher": j.publisher,
        "NA_Sales": j.na_sales,
        "EU_Sales": j.eu_sales,
        "JP_Sales": j.jp_sales,
        "Other_Sales": j.other_sales,
        "Global_Sales": j.global_sales
    } for j in data ]
    return jsonify(juegos)

@app.route('/api/opciones', methods=['GET'])
def obtener_opciones():
    plataformas = db_session.query(VideoGameSale.platform).distinct().all()
    generos = db_session.query(VideoGameSale.genre).distinct().all()
    editores = db_session.query(VideoGameSale.publisher).distinct().all()
    anios = db_session.query(VideoGameSale.year).distinct().all()

    return jsonify({
        "plataformas": sorted([p[0] for p in plataformas if p[0]]),
        "generos": sorted([g[0] for g in generos if g[0]]),
        "editores": sorted([e[0] for e in editores if e[0]]),
        "anios": sorted([a[0] for a in anios if a[0]])
    })

@app.route('/add/video_games', methods=['POST'])
def crear_videojuego():
    try:
        if not request.is_json:
            return jsonify({"error": "El contenido debe ser JSON"}), 400

        data = request.json
        print("Datos recibidos:", data)  # Para depuración

        # Validación de campos obligatorios
        required_fields = ['name', 'platform', 'genre']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Campo requerido faltante: {field}"}), 400

        # Crear nuevo juego con validación
        nuevo = VideoGameSale(
            rank=int(data.get('rank', 0)),  # Valor por defecto para rank
            name=data['name'],
            platform=data['platform'],
            year=int(data['year']) if data.get('year') else None,
            genre=data['genre'],
            publisher=data.get('publisher', ''),
            na_sales=float(data.get('na_sales', 0)),
            eu_sales=float(data.get('eu_sales', 0)),
            jp_sales=float(data.get('jp_sales', 0)),
            other_sales=float(data.get('other_sales', 0)),
            global_sales=float(data.get('global_sales', 0))
        )

        db_session.add(nuevo)
        db_session.commit()
        
        return jsonify({
            "mensaje": "Videojuego agregado correctamente",
            "id": nuevo.id
        }), 201

    except ValueError as e:
        db_session.rollback()
        return jsonify({"error": f"Error en tipos de datos: {str(e)}"}), 400
    except Exception as e:
        db_session.rollback()
        print("Error al crear videojuego:", str(e))
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/del/video_games/<int:id>', methods=['DELETE'])
def eliminar_videojuego(id):
    try:
        videojuego = db_session.query(VideoGameSale).get(id)
        if not videojuego:
            return jsonify({"error": "Videojuego no encontrado"}), 404
            
        db_session.delete(videojuego)
        db_session.commit()
        return jsonify({"mensaje": "Eliminado correctamente", "id": id}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/upd/video_games/<int:id>', methods=['PUT'])
def actualizar_videojuego(id):
    try:
        # Verificar que el contenido sea JSON
        if not request.is_json:
            return jsonify({"error": "El contenido debe ser JSON"}), 400

        data = request.get_json()
        
        # Validar campos requeridos
        required_fields = ['name', 'platform', 'genre']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Campo requerido faltante: {field}"}), 400

        # Obtener el juego existente
        juego = db_session.query(VideoGameSale).get(id)
        if not juego:
            return jsonify({"error": "Videojuego no encontrado"}), 404

        # Actualizar campos principales
        juego.name = data['name']
        juego.platform = data['platform']
        juego.genre = data['genre']
        
        # Actualizar campos opcionales
        if 'year' in data:
            juego.year = int(data['year']) if data['year'] else None
        if 'publisher' in data:
            juego.publisher = data['publisher']
            
        # Actualizar ventas
        sales_fields = ['na_sales', 'eu_sales', 'jp_sales', 'other_sales', 'global_sales']
        for field in sales_fields:
            if field in data:
                try:
                    setattr(juego, field, float(data[field]) if data[field] not in [None, ''] else 0.0)
                except ValueError:
                    setattr(juego, field, 0.0)

        db_session.commit()
        
        return jsonify({
            "mensaje": "Videojuego actualizado correctamente",
            "id": juego.id,
            "name": juego.name,
            "platform": juego.platform
        }), 200

    except ValueError as e:
        db_session.rollback()
        return jsonify({"error": f"Error en tipos de datos: {str(e)}"}), 400
    except Exception as e:
        db_session.rollback()
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500
if __name__ == '__main__':
    app.run(debug=True)
