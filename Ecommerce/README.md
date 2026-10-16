# Mini-Ecommerce: Giganet

## Objetivo
DCrear una aplicación web aplicando todos los conceptos vistos durante el semestre

# Guía de Configuración y Ejecución del Entorno (Docker)

Esta guía detalla los pasos necesarios para clonar, configurar y levantar el proyecto localmente utilizando Docker, además de la administración de la base de datos.

## Prerrequisitos (Lo que debes instalar)

Antes de clonar y arrancar el proyecto, asegúrate de tener instalado en tu computadora:

* **Git:** Para clonar el repositorio.
* **Docker Desktop:** Asegúrate de tenerlo instalado y **ejecutándose** en segundo plano (incluye Docker Compose).
* **DBeaver Community:** Gestor de bases de datos para administrar MySQL de forma visual

---

## Montaje por primera vez

### 1. Clonar el repositorio
Abre tu terminal y clona el proyecto en tu máquina:
```bash 
git clone <url-del-repositorio>
cd <nombre-de-la-carpeta>


### 2. Instalar dependencias
```bash 
Node.js (versión LTS recomendada):** Necesario para la gestión de dependencias locales (`npm install`)
npm i express mysql2 zod jsonwebtoken dotenv helmet cors
npm i bcryptjs express-rate-limit
npm i bullmq pdfkit nodemailer
npm i ioredis
docker compose up -d --build


## Endpoints
```text
GET  http://localhost:3000/
GET  http://localhost:3000/api/usuarios
GET  http://localhost:3000/api/usuarios/1
POST http://localhost:3000/api/usuarios

GET  http://localhost:3000/api/productos
GET  http://localhost:3000/api/productos/1
POST http://localhost:3000/api/productos

GET  http://localhost:3000/api/pedidos
GET  http://localhost:3000/api/pedidos/1
POST http://localhost:3000/api/pedidos
```

## base de datos
'''text
DB_ROOT_PASSWORD=1234
DB_USER=giganet
DB_PASSWORD=1234
DB_NAME=giganet_db

##Configuacion en DBeaver
SERVER_HOST:localhost
DB_USER=root
DB_ROOT_PASSWORD=1234
PORT: 3307

## Demostración para clase:NOTA
Necesitas Redis y un servidor SMTP de prueba. Mailpit (puerto 1025, interfaz web en el 8025) deja ver los correos sin enviarlos de verdad. Con Docker:

docker run -d -p 6379:6379 redis:7
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit

Corre dos procesos: node src/app.js (la API) y npm run worker.



**Conclusión:** los módulos están separados en código, pero pertenecen al mismo proceso y al mismo despliegue.
